import helper from './helpers.js';

window.addEventListener( 'load', () => {
    var room = helper.getQString( location.href, 'room' );
    var joininguser = helper.getQString( location.href, 'joininguser' );
    const username = sessionStorage.getItem( 'username' );
    
    if ( !room ) {
        //document.querySelector( '#room-create' ).attributes.removeNamedItem( 'hidden' );
        room = Math.random().toString(36).substring(10);
    }

    if ( !username && !joininguser ) {
        document.querySelector( '#username-set' ).attributes.removeNamedItem( 'hidden' );
        document.getElementById('atrium').style.visibility = 'hidden';
    }

    else {
        console.log("Attempting to connect/create room: "+room);
        let commElem = document.getElementsByClassName( 'room-comm' );
        for ( let i = 0; i < commElem.length; i++ ) {
            commElem[i].attributes.removeNamedItem( 'hidden' );
        }

        initAtrium();

        var partnerConnections = [];

        let socket = io( '/stream' );

        var socketId = '';
        var myStream = '';
        var screen = '';
        var recordedStream = [];
        var mediaRecorder = '';

        //Get user video by default
        getAndSetUserStream();


        socket.on( 'connect', () => {
            //set socketId
            socketId = socket.io.engine.id;


            let subscribeData = {
                room: room,
                socketId: socketId,
                username: (username)?username:joininguser
            };
            console.log("Emit 'subscribe': "+JSON.stringify(subscribeData))
            socket.emit( 'subscribe', subscribeData);

            socket.on( 'new user', ( data ) => {
                console.log("Received 'new user': "+JSON.stringify(data));

                let newUserStartData = { to: data.socketId, sender: socketId };
                console.log("Emit 'newUserStart': "+JSON.stringify(newUserStartData));

                socket.emit( 'newUserStart', newUserStartData);
                partnerConnections.push( data.socketId );
                init( true, data.socketId );
            } );


            socket.on( 'newUserStart', ( data ) => {
                console.log("Received 'newUserStart': "+JSON.stringify(data));
                partnerConnections.push( data.sender );
                init( false, data.sender );
            } );


            socket.on( 'ice candidates', async ( data ) => {
                console.log("Received 'ice candidates'");
                data.candidate ? await partnerConnections[data.sender].addIceCandidate( new RTCIceCandidate( data.candidate ) ) : '';
            } );


            socket.on( 'sdp', async ( data ) => {
                console.log("Received 'sdp' from "+JSON.stringify(data.sender));
                if ( data.description.type === 'offer' ) {
                    data.description ? await partnerConnections[data.sender].setRemoteDescription( new RTCSessionDescription( data.description ) ) : '';

                    helper.getUserFullMedia().then( async ( stream ) => {
                        if ( !document.getElementById( 'local' ).srcObject ) {
                            helper.setLocalStream( stream );
                        }

                        //save my stream
                        myStream = stream;

                        stream.getTracks().forEach( ( track ) => {
                            partnerConnections[data.sender].addTrack( track, stream );
                        } );

                        let answer = await partnerConnections[data.sender].createAnswer();

                        await partnerConnections[data.sender].setLocalDescription( answer );

                        socket.emit( 'sdp', { description: partnerConnections[data.sender].localDescription, to: data.sender, sender: socketId } );
                    } ).catch( ( e ) => {
                        console.error( e );
                    } );
                }

                else if ( data.description.type === 'answer' ) {
                    await partnerConnections[data.sender].setRemoteDescription( new RTCSessionDescription( data.description ) );
                }
            } );


            socket.on( 'chat', ( data ) => {
                console.log("Received 'chat': "+JSON.stringify(data));
                helper.addChat( data, 'remote' );
            } );
        } );


        function getAndSetUserStream() {
            helper.getUserFullMedia().then( ( stream ) => {
                //save my stream
                myStream = stream;

                helper.setLocalStream( stream );
            } ).catch( ( e ) => {
                console.error( `stream error: ${ e }` );
            } );
        }


        function sendMsg( msg ) {
            let data = {
                room: room,
                msg: msg,
                sender: username
            };

            //emit chat message
            socket.emit( 'chat', data );

            //add localchat
            helper.addChat( data, 'local' );
        }



        function init( createOffer, partnerName ) {
            partnerConnections[partnerName] = new RTCPeerConnection( helper.getIceServer() );

            if ( screen && screen.getTracks().length ) {
                screen.getTracks().forEach( ( track ) => {
                    partnerConnections[partnerName].addTrack( track, screen );//should trigger negotiationneeded event
                } );
            }

            else if ( myStream ) {
                myStream.getTracks().forEach( ( track ) => {
                    partnerConnections[partnerName].addTrack( track, myStream );//should trigger negotiationneeded event
                } );
            }

            else {
                helper.getUserFullMedia().then( ( stream ) => {
                    //save my stream
                    myStream = stream;

                    stream.getTracks().forEach( ( track ) => {
                        partnerConnections[partnerName].addTrack( track, stream );//should trigger negotiationneeded event
                    } );

                    helper.setLocalStream( stream );
                } ).catch( ( e ) => {
                    console.error( `stream error: ${ e }` );
                } );
            }



            //create offer
            if ( createOffer ) {
                partnerConnections[partnerName].onnegotiationneeded = async () => {
                    let offer = await partnerConnections[partnerName].createOffer();

                    await partnerConnections[partnerName].setLocalDescription( offer );

                    socket.emit( 'sdp', { description: partnerConnections[partnerName].localDescription, to: partnerName, sender: socketId } );
                };
            }



            //send ice candidate to partnerNames
            partnerConnections[partnerName].onicecandidate = ( { candidate } ) => {
                socket.emit( 'ice candidates', { candidate: candidate, to: partnerName, sender: socketId } );
            };

            //add
            partnerConnections[partnerName].ontrack = ( e ) => {
                let str = e.streams[0];
                if ( document.getElementById( `${ partnerName }-video` ) ) {
                    document.getElementById( `${ partnerName }-video` ).srcObject = str;
                }

                else {
                    //video elem
                    let newVid = document.createElement( 'video' );
                    newVid.id = `${ partnerName }-video`;
                    newVid.srcObject = str;
                    newVid.autoplay = true;
                    newVid.className = 'remote-video';

                    //video controls elements
                    let controlDiv = document.createElement( 'div' );
                    controlDiv.className = 'remote-video-controls';
                    controlDiv.innerHTML = `<i class="fa fa-microphone text-white pr-3 mute-remote-mic" title="Mute"></i>
                        <i class="fa fa-expand text-white expand-remote-video" title="Expand"></i>`;

                    //create a new div for card
                    let cardDiv = document.createElement( 'div' );
                    cardDiv.className = 'card card-sm';
                    cardDiv.id = partnerName;
                    cardDiv.appendChild( newVid );
                    cardDiv.appendChild( controlDiv );

                    //put div in main-section elem
                    document.getElementById( 'videos' ).appendChild( cardDiv );

                    helper.adjustVideoElemSize();
                }
            };



            partnerConnections[partnerName].onconnectionstatechange = ( d ) => {
                switch ( partnerConnections[partnerName].iceConnectionState ) {
                    case 'disconnected':
                    case 'failed':
                    case 'closed':
                        socket.emit( 'close', { candidate: candidate, to: partnerName, sender: socketId } );
                        helper.closeVideo( partnerName );

                        break;
                }
            };



            partnerConnections[partnerName].onsignalingstatechange = ( d ) => {
                switch ( partnerConnections[partnerName].signalingState ) {
                    case 'closed':
                        console.log( "Signalling state is 'closed'" );
                        helper.closeVideo( partnerName );
                        break;
                }
            };
        }

        function broadcastNewTracks( stream, type, mirrorMode = true ) {
            helper.setLocalStream( stream, mirrorMode );

            let track = type == 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];

            for ( let p in partnerConnections ) {
                let pName = partnerConnections[p];

                if ( typeof partnerConnections[pName] == 'object' ) {
                    helper.replaceTrack( track, partnerConnections[pName] );
                }
            }
        }


        function toggleRecordingIcons( isRecording ) {
            let e = document.getElementById( 'record' );

            if ( isRecording ) {
                e.setAttribute( 'title', 'Stop recording' );
                e.children[0].classList.add( 'text-danger' );
                e.children[0].classList.remove( 'text-white' );
            }

            else {
                e.setAttribute( 'title', 'Record' );
                e.children[0].classList.add( 'text-white' );
                e.children[0].classList.remove( 'text-danger' );
            }
        }


        function startRecording( stream ) {
            mediaRecorder = new MediaRecorder( stream, {
                mimeType: 'video/webm;codecs=vp9'
            } );

            mediaRecorder.start( 1000 );
            toggleRecordingIcons( true );

            mediaRecorder.ondataavailable = function ( e ) {
                recordedStream.push( e.data );
            };

            mediaRecorder.onstop = function () {
                toggleRecordingIcons( false );

                helper.saveRecordedStream( recordedStream, username );

                setTimeout( () => {
                    recordedStream = [];
                }, 3000 );
            };

            mediaRecorder.onerror = function ( e ) {
                console.error( e );
            };
        }


        //Chat textarea
        document.getElementById( 'chat-input' ).addEventListener( 'keypress', ( e ) => {
            if ( e.which === 13 && ( e.target.value.trim() ) ) {
                e.preventDefault();

                sendMsg( e.target.value );

                setTimeout( () => {
                    e.target.value = '';
                }, 50 );
            }
        } );


        //When the video icon is clicked
        document.getElementById( 'toggle-video' ).addEventListener( 'click', ( e ) => {
            e.preventDefault();

            let elem = document.getElementById( 'toggle-video' );

            if ( myStream.getVideoTracks()[0].enabled ) {
                e.target.classList.remove( 'fa-video' );
                e.target.classList.add( 'fa-video-slash' );
                elem.setAttribute( 'title', 'Show Video' );

                myStream.getVideoTracks()[0].enabled = false;
            }

            else {
                e.target.classList.remove( 'fa-video-slash' );
                e.target.classList.add( 'fa-video' );
                elem.setAttribute( 'title', 'Hide Video' );

                myStream.getVideoTracks()[0].enabled = true;
            }

            broadcastNewTracks( myStream, 'video' );
        } );


        //When the mute icon is clicked
        document.getElementById( 'toggle-mute' ).addEventListener( 'click', ( e ) => {
            e.preventDefault();

            let elem = document.getElementById( 'toggle-mute' );

            if ( myStream.getAudioTracks()[0].enabled ) {
                e.target.classList.remove( 'fa-microphone-alt' );
                e.target.classList.add( 'fa-microphone-alt-slash' );
                elem.setAttribute( 'title', 'Unmute' );

                myStream.getAudioTracks()[0].enabled = false;
            }

            else {
                e.target.classList.remove( 'fa-microphone-alt-slash' );
                e.target.classList.add( 'fa-microphone-alt' );
                elem.setAttribute( 'title', 'Mute' );

                myStream.getAudioTracks()[0].enabled = true;
            }

            broadcastNewTracks( myStream, 'audio' );
        } );
    }
} );
