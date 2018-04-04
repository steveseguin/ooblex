var Ooblex = new (function(){
	
	var session = {};

	var generateToken = function(){
	  var text = "";
	  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	  for (var i = 0; i < 12; i++){
	    text += possible.charAt(Math.floor(Math.random() * possible.length));
	  }
	  return text;
	};
	
	var connect = function(token = null, callback = createStream){
		if (token == null){
			token = generateToken(); // If token was not provided, generate one.
		}
		session.ws = new WebSocket("wss://brain.stevesserver.com:8100");		
		session.pc = new RTCPeerConnection({'iceServers': [{urls: "stun:stun.l.google.com:19302"}, {urls: "stun:numb.viagenie.ca:3478"}]});
		session.pc.onclose = function(){console.log("pc closed");};
		session.ws.onopen = function(){
		        console.log("connected to video server");
		        var data = {};
		        data.token = token;
		        session.ws.send(JSON.stringify(data));
		}
		session.ws.onmessage = function (evt) {
		        var msg = evt.data;
		        msg = JSON.parse(msg);
		        console.log("incoming: "+msg);
		        if (msg.request){
		                if (msg.request=="offerSDP"){
		                        callback(); // Need to create stream before an SDP offer can be generated
		                } else if (msg.request=="publish"){
		                        if (msg.jsep){
		                                publishStream(msg.jsep)
		                        } else {
		                                console.log("No SDP provided; error");
		                        }
		                }
		        }
		}
		return session;
	};	
	var createStream = function(videoElement = null){ // stream is used to generated an SDP
		if (videoElement == null){
			var videoElement = document.createElement('video');
			videoElement.autoplay = true;
			videoElement.muted = true;
			var body = document.getElementsByTagName('body')[0];
			body.appendChild(videoElement);
		}
	        navigator.getUserMedia = (  navigator.getUserMedia || navigator.mediaDevices.getUserMedia);
	        navigator.mediaDevices.getUserMedia({
	                video: {width: {ideal: 640}, height: {ideal: 480}},
	                audio: true
	        }).then(function success(stream) {
	                videoElement.srcObject = stream;
	                offerSDP(stream);
	        });
		return videoElement;
	};
	var offerSDP = function(stream){  // publisher
			session.pc.addStream(stream);
			session.pc.onicecandidate = onIceCandidate;
			session.pc.createOffer(function(description){
					session.pc.setLocalDescription(description, function (){
							publishOffer(description);
					}, function(){});
			}, errorHandler);
	};
	var publishOffer = function(description){
			console.log("publishing SDP Offer");
			console.log(description);
			var data = {};
			data.message = "Offering Requested SDP"
			data.jsep = description;
			console.log(data);
			session.ws.send(JSON.stringify(data));
	};
	var onIceCandidate = function(event){ // deprecated, but chrome still uses it.
			console.log("onIceCandidate Event");
			console.log(event);
			if (event.candidate==null){console.log("Ignoring Ice Event");return;}
			var data = {};
			data.candidate = event.candidate;
			console.log(data);
			session.ws.send(JSON.stringify(data));
	};
	var publishStream = function(description){
			session.pc.setRemoteDescription(new RTCSessionDescription(description), function(){
					console.log("Starting Video Stream Publishing");
					doStart();
					}, errorHandler);

	};
	var errorHandler = function(error){
		console.log("Error:");
		console.log(error);
	};
	return {
		publishOffer: publishOffer,
		connect: connect,
		createStream: createStream,
		generateToken: generateToken
	}
})();
