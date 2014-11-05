var socket;

var speed = 10;
var steps = 1;
var speed_mobile = 1000;
var steps_mobile = 5;
var mobile = false;
var linecolor = "#000";

var pos_sent = new Date().getTime();
var max_send_speed = 50;

var lines_till_help_fades = 20;
var line_count = 0;

function sendPos(newx,newy) {
    line_count++;
    var help = document.getElementById('help');
	if(help!= null && line_count > lines_till_help_fades) {
		main.innerHTML = "";
    }
    var elapsed = new Date().getTime() - pos_sent;
    if(elapsed > max_send_speed) {
        socket = io('/draw');
        if(socket.connect()) {
            socket.emit("logStuff", {msg: 'pos:' + newx + '|' + newy});
        }
        else {
            $(".msg").text("Deine Verbindung wurde getrennt. Bitte lade die Seite neu.");
            $(".msg").removeClass("success");
            $(".msg").removeClass("error");
            $(".dimmer-msg").show();
        }
        pos_sent = new Date().getTime();
    }
}

function sendPulse() {
    socket.emit("logStuff", {msg:'pulse:xxx'});
}

function sendNewColor() {
    socket.emit("initNewColor", {pageload: false});
}

function sendNewColorAfterPageLoad() {
    socket.emit("initNewColor", {pageload: true});
}

var line;

window.onload = function() {

    socket = io('/draw');

    socket.on('setColor', function(data) {
        color1 = data["hex1"];
        color2 = data["hex2"];
        //console.log("setcolor: " + color1);
        linecolor = color1;
        var header = document.getElementById('header');
        if(header != null) {
            header.style.backgroundColor = color1;
            header.style.backgroundImage = "url(img/crissling.png)";
        }
        var newcolor = document.getElementById('newcolor');
        if(newcolor != null) {
            newcolor.style.backgroundColor = color2;
            newcolor.style.backgroundImage = "url(img/crissling.png)";
        }
    });

    socket.on('projections', function(data) {
        if(data.num > 0) {
            $(".msg").text("Du bist mit der Projektionsfläche verbunden.");
            $(".msg").removeClass("error");
            $(".msg").addClass("success");
            $(".dimmer-msg").show();
            setTimeout(function() {
                $(".dimmer-msg").fadeOut(500, function() {
                    $(".msg").removeClass("success");
                });
            }, 3000);
        }
        else {
            $(".msg").html("Aktuell ist keine Zeichenfläche aktiv. Versuche es später noch einmal oder frag bei <a href='mailto:mail@frauzufall.de'>mail@frauzufall.de</a> nach.");
            $(".msg").removeClass("success");
            $(".msg").addClass("error");
            $(".dimmer-msg").show();
        }
    });

    socket.on('disconnect', function () {
        $(".msg").text("Die Verbindung zum Server wurde getrennt.");
        $(".msg").removeClass("success");
        $(".msg").removeClass("error");
        $(".dimmer-msg").show();
    });

    socket.on('ready', function (data) {

        /****************** GET DEVICE TYPE *******************/

        var type = "PC or other";
        if ((navigator.userAgent.match(/iPhone/) || navigator.userAgent.match(/iPod/)) || navigator.userAgent.match(/Android/)) {
            mobile = true;
            if(navigator.userAgent.match(/iPhone/))
                type="iphone";
            if(navigator.userAgent.match(/iPod/))
                type="ipod";
            if(navigator.userAgent.match(/Android/))
                type="android";
            /*
            $("<link/>", {
                rel: "stylesheet",
                type: "text/css",
                href: "mobile.css"
            }).appendTo("head");
            */
            steps = steps_mobile;
            speed = speed_mobile;
            
        }

        socket.emit("logStuff", {type: type, setcolor: data.setcolor});

    });

    /*************** EVENTS *****************************/

    _addEventListener(document,"keypress",keyfunction);
    _addEventListener(document,"keydown",keyfunction);

    _addEventListener(document,"mousedown",startmouse);
    _addEventListener(document,"mousemove",movemouse);
    _addEventListener(document,"mouseup",endmouse);

    _addEventListener(document,"touchstart",starttouch);
    _addEventListener(document,"touchmove",movetouch);
    _addEventListener(document,"touchend",endtouch);
    
    _addEventListener(document.getElementById('locate'),"touchstart",sendPulse);
    _addEventListener(document.getElementById('locate'),"mouseup",sendPulse);
    
    _addEventListener(document.getElementById('newcolor'),"touchstart",sendNewColor);
    _addEventListener(document.getElementById('newcolor'),"mouseup",sendNewColor);

    _addEventListener(document.getElementById('drawtext'),"touchstart",drawText);
    _addEventListener(document.getElementById('drawtext'),"mouseup",drawText);
    
    line = document.getElementById("line");

    center_point.x = $("#main").offset().left+$("#main").width()/2.;
    center_point.y = $("#main").offset().top+$("#main").height()/2.;
    
    sendNewColorAfterPageLoad();
}

var random_move_interval;
var random_moves_running = false;
var random_word;
var random_word_length = 0;
var random_word_step = 0;
var last_random_word_point = {x:0, y:0};
var center_point = {x:0, y:0};

function drawText() {

    opentype.load('fonts/Roboto-Black.ttf', function (err, font) {
        if (err) {
            $(".msg").html("Dein Gerät scheint diese Funktion nicht zu unterstützen.");
            $(".msg").removeClass("success");
            $(".msg").addClass("error");
            $(".dimmer-msg").show();
            setTimeout(function() {
                $(".dimmer-msg").fadeOut(500, function() {
                    $(".msg").removeClass("error");
                });
            }, 3000);
        } else {

            $(".msg").html("Gib den Text ein, der auf die Wand gezeichnet werden soll (max. 13 Zeichen):<br /><input type='text' id='wall-text' maxlength='13'/><div id='wall-text-btns'><input type='button' id='wall-text-cancel' value='Abbrechen'><input type='submit' value='OK' id='wall-text-submit'></div>");
            $(".msg").removeClass("success");
            $(".msg").removeClass("error");
            $(".dimmer-msg").addClass("scrollable");
            $(".dimmer-msg").show();
            $("#wall-text").focus();
            $("#wall-text-cancel").on("click touchstart", function() {
                $(".msg").text("");
                $(".dimmer-msg").hide();
                $(".dimmer-msg").removeClass("scrollable");
            });
            $("#wall-text-submit").on("click touchstart", function() {

                var text = $("#wall-text").val();
                
                $(".msg").text("Dein Text '" + text + "' wird gezeichnet.");
                $(".msg").addClass("success");
                setTimeout(function() {
                    $(".dimmer-msg").fadeOut(500, function() {
                        $(".msg").removeClass("success");
                        $(".dimmer-msg").removeClass("scrollable");
                    });
                }, 3000);
                
                var path = font.getPath(text, 0, 0, 820);
                random_word = path.commands;
                random_word_length = random_word.length;
                random_word_step = 0;

                //stop running text drawings
                window.clearInterval(random_move_interval);
                //start new text drawing
                sendRandomWordPoint();
    
            });
        }
    });

}

function sendRandomWordPoint() {
    if(random_word_step < random_word_length) {
        var t = random_word[random_word_step].type;
        if(t != "Z") {
            var p = convertPathPoint(random_word[random_word_step]);
            var send = {};
            send.x = p.x - last_random_word_point.x;
            send.y = p.y - last_random_word_point.y;
            var time = Math.random()*200+200;
            sendPos(send.x,send.y); 
            last_random_word_point = p;   

            //draw line
            if(connect(
                center_point.x-send.x/2.,center_point.y-send.y/2.,
                center_point.x+send.x/2.,center_point.y+send.y/2.,
                linecolor,3,line)) {
               line.style.opacity = 1;
               fade('line');
            }
        }
        
        random_word_step++;

        random_move_interval = window.setTimeout(function () {sendRandomWordPoint()}, time);
    }
    else {
        last_random_word_point = {x:0, y:0};
    }
}

function convertPathPoint(pathpoint) {
    var last = {};
    switch(pathpoint.type) {
        default:
        last.x = pathpoint.x+Math.random() *22-11;
        last.y = pathpoint.y+Math.random() *22-11;
        return last;
    }
}

var dist = 40;
var away = false;

var start_x;
var start_y;
var moving = false;

function startmouse(ev) {
    moving = true;
    start_x = ev.clientX;
    start_y = ev.clientY;
    line.style.background = 0;
    if(getTransformProperty(line)) {
        line.style.opacity = 1;
    }
}

function movemouse(ev) {
	if(moving) {
		connect(start_x,start_y,ev.clientX,ev.clientY,linecolor,3,line);
	}
}

function endmouse(ev) {
    moving = false;
    if(connect(start_x,start_y,ev.clientX,ev.clientY,linecolor,3,line)) {
        fade('line');
    }
    sendPos(ev.clientX-start_x,ev.clientY-start_y);
}

function starttouch(ev) {
    if($(".dimmer.scrollable").length == 0 || $(".dimmer").is(":hidden") ) {
        ev.preventDefault(); 
        moving = true;

        var pos = getCoords(ev);

        start_x = pos.x;
        start_y = pos.y;
        
        line.style.background = 0;
        if(getTransformProperty(line)) {
            line.style.opacity = 1;
        }
    }
}

function movetouch(ev) {
    if($(".dimmer.scrollable").length == 0 || $(".dimmer").is(":hidden") ) {
    	ev.preventDefault();
    	var pos = getCoords(ev);
        if(connect(start_x,start_y,pos.x,pos.y,linecolor,3,line)) {
            line.style.opacity = 1;
        }
    }
}

function endtouch(ev) {
    if($(".dimmer.scrollable").length == 0 || $(".dimmer").is(":hidden") ) {
    	ev.preventDefault(); 
        moving = false;

        var pos = getCoords(ev);
        if(connect(start_x,start_y,pos.x,pos.y,linecolor,3,line)) {
            fade('line');
        }

        sendPos(pos.x-start_x,pos.y-start_y);
    }   

}

/**
     * Helper method for cross-browser registering of event listeners.
     * @param {Element} element
     * @param {String} eventName
     * @param {Function} handler
     * @param {Boolean} captureEvents
     */
function _addEventListener(element, eventName, handler, captureEvents){
    if (document.addEventListener) {
        // W3C
        element.addEventListener(eventName, handler, captureEvents);
    }
    else
        if (document.attachEvent) {
            // IE
            element.attachEvent('on' + eventName, handler);
        }
        else {
            element['on' + eventName] = handler;
        }
}

var keyfunction = function(e) {

    var KeyID = (e.keyCode?e.keyCode:e.which);
    switch(KeyID) {
        //left
        case 97:
        case 37:
            sendPos(-1,0);
            break;
        //right
        case 100:
        case 39:
            sendPos(1,0);
            break;
        //up
        case 119:
        case 38:
            sendPos(0,-1);
            break;
        //down
        case 115:
        case 40:
            sendPos(0,1);
            break;
    }
}

//converts coordinates of touches to points
function getCoords(e) {
    if (e.changedTouches.length>0) {
        // Works in Chrome / Safari (except on iPad/iPhone)
        return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
//    else {
        // Works in Safari on iPad/iPhone
//        return { x: e.pageX, y: e.pageY};
//    }
}

function getOffset( el ) { // return element top, left, width, height
    var _x = 0;
    var _y = 0;
    var _w = el.offsetWidth|0;
    var _h = el.offsetHeight|0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return { top: _y, left: _x, width: _w, height: _h };
}

function connect(x1,y1,x2,y2, color, thickness,line) { // draw a line connecting elements
    // distance
    var length = Math.sqrt(((x2-x1) * (x2-x1)) + ((y2-y1) * (y2-y1)));
    // center
    var cx = ((x1 + x2) / 2) - (length / 2);
    var cy = ((y1 + y2) / 2) - (thickness / 2);
    // angle
    var angle = Math.atan2((y1-y2),(x1-x2))*(180/Math.PI);
    // make hr
    line.style.backgroundColor = color;
    line.style.height = thickness;
    line.style.left = cx;
    line.style.top = cy;
    line.style.width = length;
    var transform = getTransformProperty(line);
    if(transform) {
		line.style[transform] = "rotate(" + angle + "deg)";
        return true;
	}
    else {
        return false;
    }
}

function getTransformProperty(element) {
    // Note that in some versions of IE9 it is critical that
    // msTransform appear in this list before MozTransform
    var properties = [
        'transform',
        'WebkitTransform',
        'msTransform',
        'MozTransform',
        'OTransform'
    ];
    var p;
    while (p = properties.shift()) {
        if (typeof element.style[p] != 'undefined') {
            return p;
        }
    }
    return false;
}

var TimeToFade = 3000.0;

function fade(eid)
{
  var element = document.getElementById(eid);
  if(element == null)
    return;

    element.FadeState = -1;//element.FadeState == 2 ? -1 : 1;
    element.FadeTimeLeft = TimeToFade;
    setTimeout("animateFade(" + new Date().getTime() + ",'" + eid + "')", 33);
  //}  
}

function animateFade(lastTick, eid)
{
	if(!moving) {  
	  var curTick = new Date().getTime();
	  var elapsedTicks = curTick - lastTick;
	 
	  var element = document.getElementById(eid);
	 
	  if(element.FadeTimeLeft <= elapsedTicks)
	  {
		element.style.opacity = element.FadeState == 1 ? '1' : '0';
		element.style.filter = 'alpha(opacity = '
			+ (element.FadeState == 1 ? '100' : '0') + ')';
		element.FadeState = element.FadeState == 1 ? 2 : -2;
		return;
	  }
	 
	  element.FadeTimeLeft -= elapsedTicks;
	  var newOpVal = element.FadeTimeLeft/TimeToFade;
	  if(element.FadeState == 1)
		newOpVal = 1 - newOpVal;

	  element.style.opacity = newOpVal;
	  element.style.filter = 'alpha(opacity = ' + (newOpVal*100) + ')';
	 
	  setTimeout("animateFade(" + curTick + ",'" + eid + "')", 33);
  }
}
