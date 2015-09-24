/*
 * ICESOFT COMMERCIAL SOURCE CODE LICENSE V 1.1
 *
 * The contents of this file are subject to the ICEsoft Commercial Source
 * Code License Agreement V1.1 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of the
 * License at
 * http://www.icesoft.com/license/commercial-source-v1.1.html
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations under
 * the License.
 *
 * Copyright 2009-2014 ICEsoft Technologies Canada, Corp. All Rights Reserved.
 */

//if (!('bridgeit' in window)) {
//    throw new Error('bridgeit.sio..js requires bridgeit.js, please include bridgeit.js before bridgeit.sio..js');
//}
//
//bridgeit.sio = {};
//bridgeit.sio.client = null;
//bridgeit.sio.pushURL = null;
//bridgeit.sio.connected = false;
//
//bridgeit.sio.connect = function (pushURLString, username, password) {
//
//    if (bridgeit.sio.connected) {
//        return;
//    }
//
//    bridgeit.sio.pushURL = parseURL(pushURLString);
//    console.log('parsedURL', bridgeit.sio.pushURL);
//
//    var creds = {
//        account: bridgeit.sio.pushURL.account,
//        realm: bridgeit.sio.pushURL.realm,
//        username: username,
//        password: password,
//        host: bridgeit.sio.pushURL.hostname
//    };
//
//    if (bridgeit.io.auth.isLoggedIn()) {
//        var lastToken = bridgeit.io.auth.getLastAccessToken();
//        console.log('logged in, getting last token', creds.host, lastToken);
//        connectWithToken(bridgeit.sio.pushURL, lastToken);
//    } else {
//        console.log('logging in, getting new token', creds.host);
//        bridgeit.io.auth.login(creds)
//            .then(function (tokenInfo) {
//                //Once we get a token, we should be able to connect our socket
//                console.log('successfully logged into services', creds.host, tokenInfo);
//                connectWithToken(bridgeit.sio.pushURL, tokenInfo.access_token);
//            })
//            .catch(function (error) {
//                console.log('error connecting', error);
//                //Just for testing when directly connected to the service.
//                connectWithToken(bridgeit.sio.pushURL, 'dummyToken');
//            });
//    }
//
//};
//
//
//function parseURL(urlString) {
//    var parser = document.createElement('a');
//    parser.href = urlString;
//    var pathParts = parser.pathname.split('/');
//    parser.service = pathParts[1];
//    parser.account = pathParts[2];
//    parser.realm = pathParts[4];
//    parser.namespace = '/' + parser.account + '/realms/' + parser.realm;
//    return parser;
//}
//
//function connectWithToken(parsedURL, access_token) {
//
//    var connectionOptions = {
//        host: parsedURL.hostname,
//        secure: false,
//        path: parsedURL.pathname,
//        port: parsedURL.port,
//        query: 'access_token=' + access_token,
//        transports: ['polling'],
//        forceNew: true
//    };
//    console.log('connectionOptions', JSON.stringify(connectionOptions, null, 4));
//
//    bridgeit.sio.client = io('http://' + parsedURL.host, connectionOptions);
//    console.log('new client', bridgeit.sio.client);
//
//    bridgeit.sio.client.on('connect', function () {
//        console.log('client connected');
//        bridgeit.sio.connected = true;
//        //attachGroupHandlers();
//    });
//
//    bridgeit.sio.client.on('reconnect', function () {
//        console.log('client reconnected');
//    });
//
//    bridgeit.sio.client.on('disconnect', function () {
//        bridgeit.sio.connected = false;
//        bridgeit.sio.groupHandlers = {};
//        console.log('client disconnected');
//    });
//
//    bridgeit.sio.client.on('error', function (err) {
//        console.log(new Error(err));
//    });
//
//}
//
//bridgeit.sio.disconnect = function () {
//
//    console.log('disconnecting...');
//
//    if (!bridgeit.sio.connected) {
//        return;
//    }
//
//    if (bridgeit.sio.client) {
//        //detachGroupHandlers();
//        bridgeit.sio.client.disconnect();
//    }
//
//    //bridgeit.sio.client = null;
//};
//
//function getNamespaceGroup(groupName) {
//    return bridgeit.sio.pushURL.namespace + '/' + groupName;
//}
//
//function getNamespaceGroupEvent(groupName, eventName) {
//    return getNamespaceGroup(groupName) + '/' + eventName;
//}
//
//function getNamespaceGroupNotifyEvent(groupName) {
//    return getNamespaceGroupEvent(groupName, 'notify');
//}
//
//bridgeit.sio.groupHandlers = {};

//Attempts to dynamically add and remove group handlers isn't working yet.
//function attachGroupHandlers() {
//
//    if (!bridgeit.sio.connected) {
//        return;
//    }
//
//    var groupNames = Object.keys(bridgeit.sio.groupHandlers);
//    console.log('attaching group handlers', groupNames);
//
//    for (var i = 0; i < groupNames.length; i++) {
//        var groupName = groupNames[i];
//        bridgeit.sio.client.on(getNamespaceGroupNotifyEvent(groupName), bridgeit.sio.groupHandlers[groupName]);
//    }
//}
//
//function detachGroupHandlers() {
//
//    var groupNames = Object.keys(bridgeit.sio.groupHandlers);
//    console.log('detaching group handlers', groupNames);
//
//    for (var i = 0; i < groupNames.length; i++) {
//        var groupName = groupNames[i];
//        bridgeit.sio.client.removeListener(getNamespaceGroupNotifyEvent(groupName), bridgeit.sio.groupHandlers[groupName]);
//    }
//}


//
//
//

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
        return bridgeit.sio.pushURL.namespace + '/' + groupName;
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
        url: null,
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
            console.log('new client', this.client);

            this.client.on('connect', function () {
                console.log('client connected');
                this.connected = true;
                //attachGroupHandlers();
            });

            this.client.on('reconnect', function () {
                console.log('client reconnected');
            });

            this.client.on('disconnect', function () {
                this.connected = false;
                this.groupHandlers = {};
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

            if (b.io.auth.isLoggedIn()) {
                var lastToken = b.io.auth.getLastAccessToken();
                console.log('logged in, getting last token', this.pushURL.hostname, lastToken);
                this.connectWithToken(this.pushURL, lastToken);
            } else {

                var connectionInfo = {
                    account: this.pushURL.account,
                    realm: this.pushURL.realm,
                    host: this.pushURL.hostname,
                    username: username,
                    password: password,
                    pushURL: this.pushURL,
                    connector: connectWithToken
                };

                console.log('logging in, getting new token', JSON.stringify(connectionInfo));

                b.io.auth.login(connectionInfo)
                    .then(function (tokenInfo) {
                        //Once we get a token, we should be able to connect our socket
                        console.log('successfully logged into services', connectionInfo.host, tokenInfo);
                        connectionInfo.connector(creds.pushURL, tokenInfo.access_token);
                    })
                    .catch(function (error) {
                        console.log('error connecting', error);
                        //Just for testing when directly connected to the service.
                        connectionInfo.connectWithToken(connectionInfo.pushURL, 'dummyToken');
                    });
            }

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