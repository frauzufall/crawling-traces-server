var socket;

var speed = 10;
var steps = 1;
var speed_mobile = 1000;
var steps_mobile = 5;
var mobile = false;
var linecolor = "#000";

var pos_sent = new Date().getTime();
var max_send_speed = 50;

var random_move_interval;
var random_moves_running = false;
var random_word;
var random_word_length = 0;
var random_word_step = 0;
var last_random_word_point = {x:0, y:0};

var btn_word_stop, btn_word_start, btn_clean_all, btn_clean_me;
var txt_word;

function sendPos(newx,newy) {
    
    var elapsed = new Date().getTime() - pos_sent;
    if(elapsed > max_send_speed) {
        socket = io('/simulate');
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

    btn_clean_me = $("#clean_me");
    btn_clean_all = $("#clean_all");
    btn_word_start = $("#word_start");
    btn_word_stop = $("#word_stop");
    txt_word = $("#word");

    btn_word_stop.hide();
    txt_word.hide();

    socket = io('/simulate');

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

    btn_word_start.on("click touchstart", function() {drawWord();});
    btn_word_stop.on("click touchstart", function() {stopDrawWord();});
    btn_clean_me.on("click touchstart", function() {socket.emit("clearme"); });
    btn_clean_all.on("click touchstart", function() {socket.emit("clearall"); });
    
    line = document.getElementById("line");
    
    sendNewColorAfterPageLoad();
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

function movetouch(ev) {
	ev.preventDefault();
	var pos = getCoords(ev);
    if(connect(start_x,start_y,pos.x,pos.y,linecolor,3,line)) {
        line.style.opacity = 1;
    }
}

function endtouch(ev) {
	ev.preventDefault(); 
    moving = false;

    var pos = getCoords(ev);
    if(connect(start_x,start_y,pos.x,pos.y,linecolor,3,line)) {
        fade('line');
    }

    sendPos(pos.x-start_x,pos.y-start_y);
    
    

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
        case 65:
        case 97:
            drawWord();
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

    // var rotatestr = "rotate(" + angle + "deg)";
    // $(line).css({
    //     "-moz-transform": rotatestr,  /* FF3.5/3.6 */
    //     "-o-transform": rotatestr,  /* Opera 10.5 */
    //     "-webkit-transform": rotatestr,  /* Saf3.1+ */
    //     "transform": rotatestr,  /* Newer browsers (incl IE9) */
    //     "-sand-transform": rotatestr //fix for IE
    // });
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
   
  //if(element.FadeState == null)
  //{
    //if(element.style.opacity == null
        //|| element.style.opacity == ''
        //|| element.style.opacity == '1')
    //{
      //element.FadeState = 2;
    //}
    //else
    //{
      //element.FadeState = -2;
    //}
  //}
   
  //if(element.FadeState == 1 || element.FadeState == -1)
  //{
    //element.FadeState = element.FadeState == 1 ? -1 : 1;
    //element.FadeTimeLeft = TimeToFade - element.FadeTimeLeft;
  //}
  //else
  //{
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

function sendRandomMove() {
    var x = Math.random()*300-150;
    var y = Math.random()*300-150;
    var time = Math.random()*1000;
    sendPos(x,y);
    if(random_moves_running) {
        random_move_interval = window.setTimeout(function () {sendRandomMove()}, time);
    }
}

function sendRandomWord() {
    opentype.load('fonts/Roboto-Black.ttf', function (err, font) {
        if (err) {
             alert('Font could not be loaded: ' + err);
        } else {

            var str = randomstring(3);

            console.log(str);

            $.ajax({
              url: "http://de.wiktionary.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Substantiv_%28Deutsch%29&cmsort=sortkey&cmstartsortkeyprefix="+str+"&cmlimit=1&format=json&rawcontinue",
              dataType: "jsonp",
              cache: true,
              success: function (data) {
                var word = data.query.categorymembers[0].title;
                txt_word.text(word);
                txt_word.show();
                btn_word_stop.show();
                // Construct a Path object containing the letter shapes of the given text.
                // The other parameters are x, y and fontSize.
                // Note that y is the position of the baseline.
                var path = font.getPath(word, 0, 0, 820);
                random_word = path.commands;
                random_word_length = random_word.length;
                random_word_step = 0;

                sendRandomWordPoint();
              }

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
        }
        
        random_word_step++;

        random_move_interval = window.setTimeout(function () {sendRandomWordPoint()}, time);
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

function toHex(str) {
    var hex = '';
    for(var i=0;i<str.length;i++) {
        hex += '\x76';// +str.charCodeAt(i).toString(16);
    }
    return hex;
}

function randomstring(L) {
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz";

    for( var i=0; i < L; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function drawWord() {
    if(random_moves_running) {
        window.clearInterval(random_move_interval);
        socket.emit("clearme");
        txt_word.hide();
        btn_word_stop.hide();
    }
    console.log("sending random word");
    random_moves_running = true;
    sendRandomWord();

}

function stopDrawWord() {
    if(random_moves_running) {
        random_moves_running = false;
        window.clearInterval(random_move_interval);
        txt_word.hide();
        btn_word_stop.hide();
    }
}