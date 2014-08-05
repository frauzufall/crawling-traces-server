var httpPort = 41234;
var tcpPort = 1234;

log("--------------------- new session -----------------------");

//************************ HTTP INIT ************************//

var httpServer = require('http').createServer(handler);
httpServer.listen(httpPort);

var http_clients_col1 = Array();
var http_clients_col2 = Array();

function handler (request, response) {
     
    var filePath = '.' + request.url;
    if (filePath == './')
        filePath = './index.html';
         
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

io.on('connection', function (socket) {

	var id = socket.id;
    var msg = id + ':new:web';
    http_clients_col1[id] = null;
    http_clients_col2[id] = null;
    sendToAllOfs(msg);
    log("new web client : " + id);

  	socket.emit('ready');

  	socket.on('logStuff', function (data) {
    	if(http_clients_col1[socket.id] == null) {
			var cols = newColor(socket.id);
			var hex1 = rgbToHex(cols[0].r,cols[0].g,cols[0].b);
			var hex2 = rgbToHex(cols[1].r,cols[1].g,cols[1].b);
			//log("hex: " + hex1);
			socket.emit('setColor', {"hex1":hex1, "hex2":hex2});
		}
	    sendToAllOfs(socket.id + ":" + data.msg);
  	});

  	socket.on('initNewColor', function (data) {
    	//console.log(msg);
		var cols = newColor(socket.id);
		var hex1 = rgbToHex(cols[0].r,cols[0].g,cols[0].b);
		var hex2 = rgbToHex(cols[1].r,cols[1].g,cols[1].b);
		//log("hex: " + hex1);
		socket.emit('setColor', {"hex1":hex1, "hex2":hex2});
  	});

});

io.on('disconnection', function (socket) {

	var msg = socket.id + ':gone:web';
    sendToAllOfs(msg);
    http_clients_col1[socket.id] = null;
    http_clients_col2[socket.id] = null;
    log("gone web client: " + socket.id);
	
});

function newColor(id) {
	//res[0] .. new color
	//res[1] .. next random color
	var res = Array();
	res[1] = getRandomColor();
	if(http_clients_col2[id] == null) {
		res[0] = getRandomColor();
	}
	else {
		res[0] = http_clients_col2[id];
	}
    var msg = id + ":color:" + res[0].r + "|" + res[0].g + "|" + res[0].b;
    sendToAllOfs(msg);
    http_clients_col1[id] = res[0];
    http_clients_col2[id] = res[1];
    return res;
}

function asColor(hue) {
	var color = "hsl(" + hue + ", 60%, 70%)";    
	log(color);
    return color;
}

function log(text) {
	var n = (new Date()).toGMTString();
	console.log(n + ": " + text);
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
				break;
			}
		}
		log('Tcp connection from ' + remoteAddress + ':' + remotePort + ' closed.');
   });
}).listen(tcpPort);

function processTcpMsg(client_id, action, value, socket, orig_msg) {
	
	if(action =="color") {
		//log("server got: " + orig_msg + " from " + socket.remoteAddress + ":" + socket.remotePort);
		nowjs.getClient(client_id, function() {
			if(this != null) {
				//console.log("found client, trying to send color");
				this.now.setColor(value);
			}
			else
				log("not able to set color of client " + client_id + ": client not found.");
		});
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
					log("clearing");
					message = new Buffer("all:clear:xxx");
					socket.write(message + "\n");
					c.cleared = true;
				}
			}

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
