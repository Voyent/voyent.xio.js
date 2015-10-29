if (!('bridgeit' in window) || ('bridgeit.io' in window)) {
    throw new Error('bridgeit.xio.js requires bridgeit.js and bridgeit.io.js, please include these before bridgeit.xio.js');
}

if (!('io' in window)) {
    throw new Error('bridgeit.xio.js requires the socket.io client library.js');
}

(function (b) {

    "use strict";

    //A 'creative' way to parse a URL without requiring a separate library
    function parseURL(urlString) {
        var parser = document.createElement('a');
        parser.href = urlString;
        var pathParts = parser.pathname.split('/');
        parser.service = pathParts[1];
        parser.account = pathParts[2];
        parser.realm = pathParts[4];
        parser.namespace = '/' + parser.account + '/realms/' + parser.realm;
        return parser;
    }

    function getNamespaceGroup(groupName) {
        return b.xio.push.pushURL.namespace + '/' + groupName;
    }

    function getNamespaceGroupEvent(groupName, eventName) {
        return getNamespaceGroup(groupName) + '/' + eventName;
    }

    function getNamespaceGroupNotifyEvent(groupName) {
        return getNamespaceGroupEvent(groupName, 'notify');
    }

    var CLOUD_PUSH_KEY = "ice.notifyBack";

    function getCloudPushId() {
        if (localStorage) {
            return localStorage.getItem(CLOUD_PUSH_KEY);
        }
        return null;
    }

    var CLOUD_CONFIGURATION_KEY = "bridgeit.xio.cloud.configuration";

    function setCloudPushConfiguration(cloudConfig) {
        if (localStorage) {
            return localStorage.setItem(CLOUD_CONFIGURATION_KEY, JSON.stringify(cloudConfig));
        }
        return null;
    }

    function getCloudPushConfiguration() {
        if (localStorage) {
            return JSON.parse(localStorage.getItem(CLOUD_CONFIGURATION_KEY));
        }
        return null;
    }

    function postCloudPushConfiguration(host, account, realm, props) {

        var url = 'http://' + host + '/push/' + account + '/realms/' + realm + '/cloud?access_token=' + b.io.auth.getLastAccessToken();
        console.log('preparing to send cloud push configuration', url, props);

        b.$.post(url, props)
            .then(function (response) {
                console.log('cloud push configuration set');
                //Should we still do this?
                //b.services.auth.updateLastActiveTimestamp();
                resolve(response);
            })['catch'](function (error) {
            console.log('cloud push configuration err', error);
            reject(error);
        });
    }

    function sendCloudPushConfiguration() {

        var cpc = getCloudPushConfiguration();
        if (!cpc) {
            console.log('no cloud configuration in local storage');
            return;
        }

        console.log('retrieved cloud push configuration', cpc);

        postCloudPushConfiguration(cpc.host, cpc.account, cpc.realm, cpc.props);
    }

    function updateCloudPush(host, account, realm, props) {

        var cpc = {
            host: host,
            account: account,
            realm: realm,
            props: props
        };

        console.log('update cloud configuration', props);
        setCloudPushConfiguration(cpc);

        var cloudPushId = getCloudPushId();
        if (cloudPushId) {
            console.log('cloud push id from storage', cloudPushId);
            cpc.id = cloudPushId;
            setCloudPushConfiguration(cpc);
            sendCloudPushConfiguration();
        } else {
            b.register('_bridgeitCloudId', 'cloudRegistrationCallback');
        }
    }

    function handleNotifications(payload) {

        console.log('received notification', JSON.stringify(payload));
        if (b.xio.push.listener) {
            b.xio.push.listener(payload);
        }
    }

    //Set up the xio namespace.
    if (!b['xio']) {
        b.xio = {};
    }

    var xio = b.xio;

    xio.push = {

        connected: false,
        pushURL: null,
        client: null,
        listener: null,
        groups: [],

        connectWithToken: function (parsedURL, username, access_token) {

            var connectionOptions = {
                host: parsedURL.hostname,
                secure: false,
                path: parsedURL.pathname,
                port: parsedURL.port,
                query: 'access_token=' + access_token,
                transports: ['polling'],
                forceNew: true
            };
            console.log('connectionOptions', JSON.stringify(connectionOptions, null, 4));

            this.client = io('http://' + parsedURL.host, connectionOptions);

            //I don't have the scoping right, but for now I'm just setting the "outer"
            //client manually.
            xio.push.client = this.client;

            console.log('new client', this.client);

            this.client.on('connect', function () {
                console.log('client connected');
                xio.push.connected = true;
                xio.push.rejoinGroups();

                //Automatically join the group associated with this username
                xio.push.join(username);
            });

            this.client.on('reconnect', function () {
                console.log('client reconnected');
                xio.push.rejoinGroups();
            });

            this.client.on('disconnect', function () {
                xio.push.connected = false;
                console.log('client disconnected');
            });

            this.client.on('error', function (err) {
                console.log('client error', new Error(err));
            });

        },

        /**
         * Establish a connection (polling, websocket) to the Push host. Will login and get
         * an access_token as required.
         *
         * @param {String} pushURLString The URL of the Push host
         * @param {String} username
         * @param {String} password
         *
         */
        connect: function (pushURLString, username, password) {

            if (this.connected) {
                return;
            }

            this.pushURL = parseURL(pushURLString);
            console.log('parsedURL', this.pushURL);

            var connectionInfo = {
                account: this.pushURL.account,
                realm: this.pushURL.realm,
                host: this.pushURL.hostname,
                username: username,
                password: password,
                pushURL: this.pushURL,
                connectSocketIO: this.connectWithToken,
                usePushService: false
            };

            console.log('connecting via bridgeit.xio', JSON.stringify(connectionInfo, null, 4));

            b.io.auth.connect(connectionInfo)
                .then(function () {
                    //Once we connect, we should be able to connect our socket.io client.
                    var lastToken = b.io.auth.getLastAccessToken();
                    console.log('successfully logged into services', connectionInfo.host, lastToken);
                    connectionInfo.connectSocketIO(connectionInfo.pushURL, connectionInfo.username, lastToken);
                })
                .catch(function (error) {
                    console.log('error connecting', error);
                    //Just use a dummy token for testing when directly connected to the service.
                    //connectionInfo.connectSocketIO(connectionInfo.pushURL, 'dummyToken');
                });
        },

        disconnect: function () {

            console.log('disconnecting...');

            b.io.auth.disconnect();

            if (!this.connected) {
                return;
            }

            if (this.client) {
                this.client.disconnect();
            }
        },


        refreshConnection: function () {
            console.log('refreshing connection');
            xio.push.disconnect();
            xio.push.connectWithToken(xio.push.pushURL, b.io.auth.getLastAccessToken());
        },


        addListener: function (listener) {
            this.listener = listener;
        },

        removeListener: function () {
            this.listener = null;
        },

        join: function (group) {

            console.log('attempting to join group', group);

            if (!this.connected) {
                console.log('not yet connected');
                return;
            }

            if (this.groups.indexOf(group) >= 0) {
                console.log('already a member', group);
                return;
            }

            console.log('joining', group, getNamespaceGroupNotifyEvent(group));
            this.groups.push(group);
            this.client.on(getNamespaceGroupNotifyEvent(group), handleNotifications);
            this.client.emit('join', group);
        },

        leave: function (group) {

            if (!this.connected) {
                return;
            }

            console.log('leave', group);

            var groupIndex = this.groups.indexOf(group);
            if (groupIndex === -1) {
                console.log('not a member', group);
                return;
            }

            console.log('leaving', group);
            this.client.removeListener(getNamespaceGroupNotifyEvent(group), handleNotifications);
            this.client.emit('leave', group);
            this.groups.splice(groupIndex, 1);
        },

        rejoinGroups: function () {

            //If a socket gets disconnected for some reason, a reconnection can occur
            //automatically but the groups that were joined will have gone away.  This
            //function tries to rejoin the groups.
            if (!this.connected) {
                return;
            }

            console.log('rejoining groups', this.groups);

            for (var i = 0; i < this.groups.length; i++) {
                var group = this.groups[i];
                var ns = getNamespaceGroupNotifyEvent(group)
                console.log('rejoining', group, ns);
                this.client.on(ns, handleNotifications);
                this.client.emit('join', group);
            }
        },

        send: function (group, message) {
            if (!this.connected) {
                return;
            }
            var payload = {
                group: group,
                message: message
            };
            console.log('send', payload);
            this.client.emit('send', payload);
        },

        suspend: function () {
            console.log('suspending unimplemented');
        },

        cloudRegistrationCallback: function (results) {
            console.log('cloud registration callback', results);
            var cloudPushId = getCloudPushId();
            console.log('cloud push id from registration', cloudPushId);
        },

        enableCloudPush: function (host, account, realm) {
            updateCloudPush(host, account, realm, {enabled: true});
        },

        disableCloudPush: function (host, account, realm) {
            updateCloudPush(host, account, realm, {enabled: false});
        }

    };


})(bridgeit);

//The callback for cloud registration has to be in window.scope.
window.cloudRegistrationCallback = bridgeit.xio.push.cloudRegistrationCallback;