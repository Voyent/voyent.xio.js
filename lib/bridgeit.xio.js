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


    //Set up the xio namespace.
    if (!b['xio']) {
        b.xio = {};
    }

    var xio = b.xio;

    xio.push = {

        connected: false,
        pushURL: null,
        client: null,
        groupHandlers: {},

        connectWithToken: function (parsedURL, access_token) {

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
                //attachGroupHandlers();
            });

            this.client.on('reconnect', function () {
                console.log('client reconnected');
            });

            this.client.on('disconnect', function () {
                xio.push.connected = false;
                xio.push.groupHandlers = {};
                console.log('client disconnected');
            });

            this.client.on('error', function (err) {
                console.log(new Error(err));
            });

        },

        /**
         * Establish a connection (polling, websocket) to the Push host. Will login and get
         * an access_token as required.
         *
         * @param {String} pushURLString The URL of the Push host
         * @param {String} username (optional)
         * @param {String} password (optional)
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
                usePushService: false,
                connectionTimeout: 10
            };

            console.log('connecting via bridgeit.io', JSON.stringify(connectionInfo, null, 4));

            b.io.auth.connect(connectionInfo)
                .then(function () {
                    //Once we connect, we should be able to connect our socket.io client.
                    var lastToken = b.io.auth.getLastAccessToken();
                    console.log('successfully logged into services', connectionInfo.host, lastToken);
                    connectionInfo.connectSocketIO(connectionInfo.pushURL, lastToken);
                })
                .catch(function (error) {
                    console.log('error connecting', error);
                     //Just use a dummy token for testing when directly connected to the service.
                    //connectionInfo.connectSocketIO(connectionInfo.pushURL, 'dummyToken');
                });
        },

        disconnect: function () {

            console.log('disconnecting...');

            if (!this.connected) {
                return;
            }

            if (this.client) {
                //detachGroupHandlers();
                this.client.disconnect();
            }

            //bridgeit.sio.client = null;
        },


        join: function (group, handler) {

            if (!this.connected) {
                return;
            }

            console.log('join called', group);

            if (this.groupHandlers[group]) {
                console.log('already a member', group);
                return;
            }

            console.log('joining', group, getNamespaceGroupNotifyEvent(group));
            this.groupHandlers[group] = handler;
            this.client.on(getNamespaceGroupNotifyEvent(group), handler);
            this.client.emit('join', group);
        },

        leave: function (group) {

            if (!this.connected) {
                return;
            }

            console.log('leave', group);

            if (!this.groupHandlers[group]) {
                console.log('not a member', group);
                return;
            }
            console.log('leaving', group);
            this.client.removeListener(getNamespaceGroupNotifyEvent(group), this.groupHandlers[group]);
            this.client.emit('leave', group);
            delete this.groupHandlers[group];
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

        cloud: function (settings) {
            console.log('cloud settings unimplemented', settings);
        }

    };


})(bridgeit);