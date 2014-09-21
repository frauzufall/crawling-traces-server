var httpPort = 41234;
var tcpPort = 1234;

log("--------------------- new session -----------------------");

//************************ HTTP INIT ************************//

var httpServer = require('http').createServer(handler);
httpServer.listen(httpPort);

var http_clients = Array();
var http_clients_inactive = Array();
var http_clients_col1 = Array();
var http_clients_col2 = Array();
var http_clients_new = Array();
var http_clients_present = Array();

function handler (request, response) {
     
    var filePath = '.' + request.url;
    if (filePath == './draw')
        filePath = './index.html';

    if (filePath == './control')
        filePath = './control.html';
         
    var extname = path.extname(filePath);
    var contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
    }
     
    fs.exists(filePath, function(exists) {
     
        if (exists) {
            fs.readFile(filePath, function(error, content) {
                if (error) {
                    response.writeHead(500);
                    response.end();
                }
                else {
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(content, 'utf-8');
                }
            });
        }
        else {
            response.writeHead(404);
            response.end();
        }
    });
}

//************************ WEB CLIENT STUFF ************************//

var fs = require('fs');
var path = require('path');

var io = require('socket.io')(httpServer);

var io_control = io.of('/control');
io_control.on('connection', function (socket) {
	log('someone connected to control');
	updateClientList();
});

var io_base = io.of('/draw');
io_base.on('connection', function (socket) {

	log("connect");

	var knownclient = null;
	var id = getId(socket);

	//check wether id was already there and left
	for(var i = 0; i < http_clients_inactive.length; i++) {
		if(getId(http_clients_inactive[i]) == id) {
			knownclient = http_clients_inactive[i];
			break;
		}
	}
	//check wether id is already there e.g. in another tab
	for(var i = 0; i < http_clients.length; i++) {
		if(getId(http_clients[i]) == id) {
			knownclient = http_clients[i];
			break;
		}
	}

	http_clients_new[id] = (knownclient == null);

	//save socket instance to active client list
	http_clients.push(socket);

	if(!knownclient) {
		//id is new
		
    	http_clients_col1[id] = null;
    	http_clients_col2[id] = null;
    	
    	//tell projections about new client
    	var msg = id + ':new:web';
    	sendToAllOfs(msg);

    	//tell socket to initialize and to ask for a new color
    	socket.emit('ready', {setcolor: true});
    	
    	log("new web client: " + id);
	}
	else {
		
		//tell socket to initialize and not ask for a color, previous color should be used
		socket.emit('ready', {setcolor: false});
    	
    	//create new random color
    	var cols = newColor();
    	//check wether there is a saved color pack from previous session of the id
    	if(http_clients_col1[id] && http_clients_col2[id]) {
			cols[0] = http_clients_col1[id];
	    	cols[1] = http_clients_col2[id];
    	}
    	//send this color pack to projections and to socket
    	newColor(id,cols);
    
    	//tell projections that client reappeared (can be used to change id)
    	var msg = id + ':id:' + id;
    	sendToAllOfs(msg);

    	log("web client logged in again: " + id);

    	//remove saved socket instance from inactive list
		http_clients_inactive.splice(http_clients_inactive.indexOf(knownclient), 1);
	}

  	socket.on('logStuff', function (data) {
    	if(http_clients_col1[id] == null && data.setcolor) {
			newColor(id);
		}
	    sendToAllOfs(id + ":" + data.msg);
  	});

  	socket.on('initNewColor', function (data) {
  		if(http_clients_new[id] || !data.pageload) {
			newColor(id);
  		}
  	});

  	socket.on('disconnect', function () {

  		log("disconnect");

  		//check wether there is another tab open
	    var socketactive = false;
	    for(var i = 0; i < http_clients.length; i++) {
	    	var socketid = getId(http_clients[i]);
	    	if(socketid == id && http_clients[i] !== socket) {
	    		socketactive = true;
	    		break;
	    	}
	    }

	    if(!socketactive) {
	    	//no other tab is open
			
			//save gone socket locally
			var saved_as_inactive = false;
			for(var i = 0; i < http_clients_inactive.length; i++) {
		    	var socketid = getId(http_clients_inactive[i]);
		    	if(socketid == id) {
		    		saved_as_inactive = true;
		    		break;
		    	}
		    }
		    if(!saved_as_inactive)
				http_clients_inactive.push(socket);

			//tell projections that socket is gone
			var msg = id + ':gone:web';
			sendToAllOfs(msg);
			log("gone web client: " + id);

	    }

	    //remove the socket from local storage
		http_clients.splice(http_clients.indexOf(socket), 1);

		//update list of sockets on control page
	    updateClientList();
		
	});

	//update list of sockets on control page
  	updateClientList();

});

function getId(socket) {
	return socket.request.connection.remoteAddress;
}

function newColor(id, color) {

	//res[0] .. new color
	//res[1] .. next random color
	var res = Array();
	var idset = typeof id !== 'undefined';
	var colorset = typeof color !== 'undefined';

	//set color
	if(colorset) {
		res = color;
	}
	else {
		res[1] = getRandomColor();
		if(idset) {
			if(http_clients_col2[id] == null) {
				res[0] = getRandomColor();
			}
			else {
				res[0] = http_clients_col2[id];
			}
		}
		else {
			res[0] = getRandomColor();
		}
	}

	//send color
	if(idset) {

		//save colors locally
	    http_clients_col1[id] = res[0];
	    http_clients_col2[id] = res[1];
		
		//update client color within all projections
		var msg = id + ":color:" + res[0].r + "|" + res[0].g + "|" + res[0].b;
	    sendToAllOfs(msg);

		//send to all webclients with the same id
		var hex1 = rgbToHex(res[0].r,res[0].g,res[0].b);
		var hex2 = rgbToHex(res[1].r,res[1].g,res[1].b);
		for(var i = 0; i < http_clients.length; i++) {
			var socketid = getId(http_clients[i]);
			if(socketid == id) {
				http_clients[i].emit('setColor', {"hex1":hex1, "hex2":hex2});
			}
		}

	}
	
    return res;
}

function asColor(hue) {
	var color = "hsl(" + hue + ", 60%, 70%)";
    return color;
}

function log(text) {
	var n = (new Date()).toGMTString();
	console.log(n + ": " + text);
}

function updateClientList() {
	log("web: " + http_clients.length + " old web: " + http_clients_inactive.length + " tcp: " + tcp_clients.length);
	tcp_clients_min = new Array();
	for(var i = 0; i < tcp_clients.length; i++) {
		tcp_clients_min.push(tcp_clients[i].id);
	}
	web_clients_min = new Array();
	for(var i = 0; i < http_clients.length; i++) {
		web_clients_min.push(http_clients[i].id);
	}
	for(var i = 0; i < http_clients.length; i++) {
    	io_control.emit('update-clients', {"tcpclients":tcp_clients_min, "httpclients": web_clients_min});
    }
}

//************************ communication from webclients and arduino to openframeworks ************************//

function sendToAllOfs(msg) {
    for(var i = 0; i < tcp_clients_num; i++) {
        if(tcp_clients[i].type == "of") {
            tcp_clients[i].socket.write(msg + "\n");
		}
    }
}

//************************ arduino, openframeworks **********************************************************//

function Client (type) {
	this.port = "";
	this.address = "localhost";
	this.id = "";
	this.cleared = false;
	this.type = "";
	this.socket = null;
}

var tcp_clients = new Array();
var tcp_clients_num = 0;

var net = require("net");

net.createServer(function(socket) {
	var remoteAddress = socket.remoteAddress;
	var remotePort = socket.remotePort;

   log('Tcp connection from ' + remoteAddress  + ':' + remotePort + " established.");

   socket.on('data', function(data) {
		//console.log("server got: " + data.toString() + " from " + remoteAddress + ":" + remotePort);
		//var msg = "" + data.toString().replace(/(\n|\s|\r|\N)/g,"");
		var parts = data.toString().split("\n");
		//console.log(parts.length+" PART MSG, INCOMING");
        for (var i = 0; i <= parts.length -1; i++) {
			var msg = parts[i];
			var msg_parts =msg.split(":");
			if(msg_parts.length == 3) {
				//console.log("valid msg: " + msg);
				processTcpMsg(msg_parts[0],msg_parts[1],msg_parts[2], socket, msg);
			}	
        }
   });

   socket.on('close', function() {
      // Remove from array of clients
      //clients.splice(clients.indexOf(remoteAddress + ':' + remotePort), 1);
		for(var i = 0; i < tcp_clients_num; i++) {
			if(tcp_clients[i].address == remoteAddress && tcp_clients[i].port == remotePort) {
				tcp_clients.remove(i);
				tcp_clients_num--;
				updateClientList();
				break;
			}
		}
		log('Tcp connection from ' + remoteAddress + ':' + remotePort + ' closed.');
   });
}).listen(tcpPort);

function processTcpMsg(client_id, action, value, socket, orig_msg) {
	
	if(action =="color") {
		//log("server got: " + orig_msg + " from " + socket.remoteAddress + ":" + socket.remotePort);
		for(var i = 0; i < http_clients.length; i++) {
			if(client_id == getId(http_clients[i])) {
				//TODO not implemented yet why do i need this?
				//http_clients[i].emit('setColor', {"hex1":value});
			}
		}
	}
	else {
		var i,c;
		for(i = 0; i < tcp_clients_num; i++) {
			if(tcp_clients[i].id == client_id) {
				break;
			}
		}
		if(i == tcp_clients_num) {

			//no existing client found

			//tcp_clients.push(remoteAddress + ':' + remotePort);
			tcp_clients.push(new Client());
			tcp_clients_num++;

			c = tcp_clients[tcp_clients_num-1];

			c.id = client_id;

			if(action == "new")
				c.type = value;
			else 
				c.type = "unknown";

			log("new tcp " + c.type + " client: " + c.id);

			if(c.type == "of") {
				var message = new Buffer("Welcome new tcp " + c.type + " client: " + c.id);
				socket.write(message + "\n");
				if(!c.cleared) {
					log("clearing projections");
					message = new Buffer("all:clear:xxx");
					socket.write(message + "\n");
					c.cleared = true;
				}
			}

			updateClientList();

		}
		else if (i < tcp_clients_num) {

			c = tcp_clients[i];

			if(c.type == "of") {
				if(!c.cleared) {
					var message = new Buffer("all:clear:xxx");
					socket.write(message + "\n");
					c.cleared = true;
				}
			}
		}
		
		if(action == "id") {
			c.id = value;
		}
		else if(action == "address") {
			c.address = value;
		}
		else if(action == "pos") {
			sendToAllOfs(orig_msg);
		}
		else if(action == "getcolor"){
			var col = http_clients_col1[value];
			if(col) {
				if(col != null) {
					var msg = value + ":color:" + col.r + "|" + col.g + "|" + col.b;
					sendToAllOfs(msg);
				}
			}
		}
		
		c.port = socket.remotePort;
		c.address = socket.remoteAddress;
		c.socket = socket;
	}

}

function getRandomColor() {
	/*
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.round(Math.random() * 15)];
    }
    * */
    var hue = Math.random() * 360;
	var color = hslToRgb(hue, 50,50);   
    return color;
}

function rgbToHsl(r, g, b){
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {h: h, s: s, l: l};
}

function hslToRgb(h, s, l) {
	var m1, m2, hue;
	var r, g, b
	s /=100;
	l /= 100;
	if (s == 0)
		r = g = b = (l * 255);
	else {
		if (l <= 0.5)
			m2 = l * (s + 1);
		else
			m2 = l + s - l * s;
		m1 = l * 2 - m2;
		hue = h / 360;
		r = HueToRgb(m1, m2, hue + 1/3);
		g = HueToRgb(m1, m2, hue);
		b = HueToRgb(m1, m2, hue - 1/3);
	}
	return {r: r, g: g, b: b};
}

function HueToRgb(m1, m2, hue) {
	var v;
	if (hue < 0)
		hue += 1;
	else if (hue > 1)
		hue -= 1;

	if (6 * hue < 1)
		v = m1 + (m2 - m1) * hue * 6;
	else if (2 * hue < 1)
		v = m2;
	else if (3 * hue < 2)
		v = m1 + (m2 - m1) * (2/3 - hue) * 6;
	else
		v = m1;

	return 255 * v;
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
	r = Math.round(r);
	g = Math.round(g);
	b = Math.round(b);
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};
