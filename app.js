var httpPort = 41234;
var tcpPort = 1234;

log("--------------------- new session -----------------------");

//************************ HTTP INIT ************************//

var httpServer = require('http').createServer(handler);
httpServer.listen(httpPort);

// has the following structure: {"192.168.178.1": {"sslkwerh12", "asdflaij213", ..}}
var http_clients = Array();
var http_clients_col1 = Array();
var http_clients_col2 = Array();
var http_clients_new = Array();

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
                	log("500 error");
                	log(error);
                	log(filePath);
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

var ioParams = {'reconnection limit': 3000, 'max reconnection attempts': Number.MAX_VALUE, 'connect timeout':7000}
var io = require('socket.io')(httpServer);

var io_control = io.of('/control');
io_control.on('connection', function (socket) {

	var ip = getId(socket);

	updateClientList();

	socket.on('joinMapping', function (data) {
  		socket.join("mapping-"+data.client);
  		sendToOf(data.client, ip + ":getmapping:xxx");
  	});

  	socket.on('updateMappingForm', function (data) {
    	sendToOf(data.client, ip + ":" + data.msg);
  	});

  	socket.on('newMappingForm', function (data) {
    	sendToOf(data.client, ip + ":" + data.msg);
  	});

});

var io_base = io.of('/draw');
io_base.on('connection', function (socket) {

	var knownclient = false;
	var ip = getId(socket);
	var unique_id = socket.id;

	socket.join("web-"+ip);

	//check wether ip is or has been already there
	if(http_clients[ip]) {
		knownclient = true;
	}
	else {
		http_clients[ip] = new Array();
	}

	http_clients_new[ip] = !knownclient;

	//save socket id to active client list
	http_clients[ip].push(unique_id);

	if(!knownclient) {
		//ip is new
		
    	http_clients_col1[ip] = null;
    	http_clients_col2[ip] = null;
    	
    	//tell projections about new client
    	var msg = ip + ':new:web';
    	sendToAllOfs(msg);

    	//tell socket to initialize and to ask for a new color
    	socket.emit('ready', {setcolor: true});
    	
    	log("new web client: " + ip);
	}
	else {
		
		//tell socket to initialize and not ask for a color, previous color should be used
		socket.emit('ready', {setcolor: false});
    	
    	//create new random color
    	var cols = newColor();
    	//check wether there is a saved color pack from previous session of the ip
    	if(http_clients_col1[ip] && http_clients_col2[ip]) {
			cols[0] = http_clients_col1[ip];
	    	cols[1] = http_clients_col2[ip];
    	}
    	//send this color pack to projections and to socket
    	newColor(ip,cols);
    
    	//tell projections that client reappeared (can be used to change ip)
    	var msg = ip + ':id:' + ip;
    	sendToAllOfs(msg);

    	log("web client logged in again: " + ip);

	}

	socket.emit('projections', {"num":tcp_clients_num});

  	socket.on('logStuff', function (data) {
    	if(http_clients_col1[ip] == null && data.setcolor) {
			newColor(ip);
		}
	    sendToAllOfs(ip + ":" + data.msg);
	    io_control.emit('client-active', {"id":ip});
  	});

  	socket.on('initNewColor', function (data) {
  		if(http_clients_new[ip] || !data.pageload) {
			newColor(ip);
  		}
  	});

  	socket.on('disconnect', function () {

  		//remove the socket from local storage
  		http_clients[ip].splice(http_clients[ip].indexOf(unique_id), 1);

  		//check wether there is another tab open
	    var socketactive = false;
	    if(http_clients[ip].length > 0) {
	    	socketactive = true;
	    }

	    if(!socketactive) {
	    	//no other tab is open

			//tell projections that socket is gone
			var msg = ip + ':gone:web';
			sendToAllOfs(msg);
			log("gone web client: " + ip);

	    }

		//update list of sockets on control page
	    updateClientList();
		
	});

	//update list of sockets on control page
  	updateClientList();

});

function getId(socket) {
	return String(socket.request.connection.remoteAddress).hashCode();
}

function newColor(ip, color) {

	//res[0] .. new color
	//res[1] .. next random color
	var res = Array();
	var idset = typeof ip !== 'undefined';
	var colorset = typeof color !== 'undefined';

	//set color
	if(colorset) {
		res = color;
	}
	else {
		res[1] = getRandomColor();
		if(idset) {
			if(http_clients_col2[ip] == null) {
				res[0] = getRandomColor();
			}
			else {
				res[0] = http_clients_col2[ip];
			}
		}
		else {
			res[0] = getRandomColor();
		}
	}

	//send color
	if(idset) {

		//save colors locally
	    http_clients_col1[ip] = res[0];
	    http_clients_col2[ip] = res[1];
		
		//update client color within all projections
		var msg = ip + ":color:" + res[0].r + "|" + res[0].g + "|" + res[0].b;
	    sendToAllOfs(msg);

		//send to all webclients with the same ip
		var hex1 = rgbToHex(res[0].r,res[0].g,res[0].b);
		var hex2 = rgbToHex(res[1].r,res[1].g,res[1].b);
		for(var i = 0; i < http_clients[ip].length; i++) {
			io_base.to("web-"+ip).emit('setColor', {"hex1":hex1, "hex2":hex2});
		}
		io_control.emit('colorChanged', {id: ip, color: hex1});

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

//TODO FROM HERE

function updateClientList() {
	//log("web: " + Object.keys(http_clients).length + " tcp: " + tcp_clients.length);

	//store tcp ids in array
	var tcp_clients_min = new Array();
	for(var i = 0; i < tcp_clients.length; i++) {
		tcp_clients_min.push({ 
			id: tcp_clients[i].id 
		});
	}

	//store http socket ips and the related color in array
	var web_clients_min = new Array();
	var http_ips = Object.keys(http_clients);
	for(var i = 0; i < http_ips.length; i++) {
		//log("webclient: "+http_ips[i] + " [" + http_clients[http_ips[i]].length + "]");
		var col = http_clients_col1[http_ips[i]];
		var hex_col = null;
		if(col) {
			hex_col = rgbToHex(col.r,col.g,col.b);
		}
		web_clients_min.push({ 
			id : http_ips[i], 
			color: hex_col
		});
	}
	
	//send tcp and http clients to control page sockets
    io_control.emit('update-clients', {"tcpclients":tcp_clients_min, "httpclients": web_clients_min});

    //tell draw client if any projection is connected
    if(tcp_clients_drawers_know != tcp_clients_num) {

    	io_base.emit('projections', {"num":tcp_clients_num});
    	tcp_clients_drawers_know = tcp_clients_num;
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

function sendToOf(id, msg) {
    for(var i = 0; i < tcp_clients_num; i++) {
        if(tcp_clients[i].id == id) {
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
var tcp_clients_drawers_know = 0;

var net = require("net");

net.createServer(function(socket) {
	var remoteAddress = socket.remoteAddress;
	var remotePort = socket.remotePort;

   log('Tcp connection from ' + remoteAddress  + ':' + remotePort + " established.");

   socket.on('data', function(data) {
		//console.log("server got: " + data.toString() + " from " + remoteAddress + ":" + remotePort);
		var parts = data.toString().split("\n");
		//console.log(parts.length+" PART MSG, INCOMING");
        for (var i = 0; i <= parts.length -1; i++) {
			
			var msg = parts[i];
			
			//removes charcode 0 from beginning... this happens sometimes and drove me crazy. 
			msg = msg.replace(/[\x00-\x1f]/, "");

			var msg_parts =msg.split(":");
			if(msg_parts.length == 3) {
				//log("valid msg: " + msg);
				processTcpMsg(msg_parts[0],msg_parts[1],msg_parts[2], socket, msg);
			}	
        }
   });

   socket.on('close', function() {
      // Remove from array of clients
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
				//TODO not implemented yet | why do i need this?
				//http_clients[i].emit('setColor', {"hex1":value});
			}
		}
	}
	else {
		var i,c;
		for(i = 0; i < tcp_clients_num; i++) {
			if(tcp_clients[i].id === client_id) {
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
		else if(action == "mappingsize") {
			var mappingsize = value.split("|");
			if(mappingsize.length == 2) {
				io_control.to("mapping-"+client_id).emit("mappingSize", {width: mappingsize[0], height: mappingsize[1]});
			}
		}
		else if(action == "updatemappingform") {
			io_control.to("mapping-"+client_id).emit('updateMappingForm', decodeMappingString(value));
		}
		else if(action == "newmappingform") {
			var data = decodeMappingString(value);
			io_control.to("mapping-"+client_id).emit('newMappingForm', data);
		}
		else if(action == "lineto" || action == "moveto") {
			var data = value.split(";");
			var drawer_id = data[0];
			var pos = data[1].split("|");
			var color = rgbVecToHex(http_clients_col1[drawer_id]);
			io_control.to("mapping-"+client_id).emit('movedDrawer', {id: drawer_id, pos: pos, color: color});
		}
		else if(action == "pulsing") {
			var drawer_id = value;
			var color = rgbVecToHex(http_clients_col1[drawer_id]);
			io_control.to("mapping-"+client_id).emit('pulsingDrawer', {id: drawer_id, color: color});
		}
		
		c.port = socket.remotePort;
		c.address = socket.remoteAddress;
		c.socket = socket;
	}

}

//input string: "1;window;714.667|548.148,992|601.482,924.444|737.778,682.667|702.222"
//output array: {id: 1, type: "window", points: {{x: 714.667, y: 548.148}, {x: 992, y: 601.482}, ..} }
function decodeMappingString(string) {
	var form = {};
	var split1 = string.split(";");
	if(split1.length == 3) {
		form.id = split1[0];
		form.type = split1[1];
		var split2 = split1[2].split(",");
		form.points = {};
		for (var i = 0; i < split2.length; i++) {
			var split3 = split2[i].split("|");
			form.points[i] = {x: split3[0], y: split3[1]};
		}
	}
	else {
		form = null;
	}
	if(form == null) {
		log("Error while decoding mapping string '" + string + "'");
	}
	return form;
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

function rgbVecToHex(vec) {
	if(typeof vec !== 'undefined' && 
		vec != null && 
		typeof vec.r !== 'undefined' && 
		typeof vec.g !== 'undefined' && 
		typeof vec.b !== 'undefined') {
		return rgbToHex(vec.r,vec.g,vec.b);
	}
	else {
		return "#000000";
	}
}

Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};


// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
  Object.keys = (function () {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

    return function (obj) {
      if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }

      var result = [], prop, i;

      for (prop in obj) {
        if (hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }

      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
}

String.prototype.hashCode = function(){
	var hash = 0;
	if (this.length == 0) return hash;
	for (i = 0; i < this.length; i++) {
		char = this.charCodeAt(i);
		hash = ((hash<<5)-hash)+char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}
