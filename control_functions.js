var socket;

var videosize = {width: 560, height: 315};
var canvassize = {width: 560, height: 315};
var video_ratio_w = videosize.width/videosize.height;
var video_ratio_h = videosize.height/videosize.width;

var drawings = new Array();
var drawing_markers = new Array();
var drawing_points = new Array();

var max_drawing_points = 42;

var mappings = new Array();

var panel_mapping, panel_drawing;

var mapping_loaded = false;

function getDrawing(id) {
    if(typeof drawings[id] === 'undefined') {
        var line = panel_drawing.polyline().fill("none").stroke({ width: 4 });
        var marker = panel_drawing.circle(10).fill("none");
        drawings[id] = line;
        drawing_markers[id] = marker;
        drawing_points[id] = "";
    }
    return drawings[id];
}

function setDrawingColor(id, _color) {
    var drawing = getDrawing(id);
    drawing.stroke({color: _color, width: 4});
    drawing_markers[id].stroke({color: _color, width: 4});
}

function clearMappingForms() {
    panel_mapping.clear();
    while (mappings.length > 0) { mappings.pop(); }
}

function resizeCanvas() {
    var scalex = 1;
    var scaley = 1;
    var w_w = parseFloat($(window).width()-$("#additional").width());
    var w_h = parseFloat($("#additional").height());
    var c_w = parseFloat(canvassize.width);
    var c_h = parseFloat(canvassize.height);
    var ratio_w = parseFloat(w_w) / parseFloat(canvassize.width);
    var ratio_h = parseFloat(w_h) / parseFloat(canvassize.height);
    if(c_h*ratio_w > c_h) {
        //cannot set to full width, set to height of sidebar
        videosize.height = w_h;
        videosize.width = videosize.height*video_ratio_w;
    }
    else {
        videosize.width = w_w;
        videosize.height = videosize.width*video_ratio_h;
    }

    scalex = videosize.width/canvassize.width;
    scaley = videosize.height/canvassize.height;

    panel_mapping.transform({scaleX: scalex, scaleY:scaley});
    panel_drawing.transform({scaleX: scalex, scaleY:scaley});

    var stream = document.getElementById("stream");
    $(stream).attr("height", videosize.height);
    $(stream).attr("width", videosize.width);
    var stream_embed = document.getElementById("stream_embed");
    $(stream_embed).attr("height", videosize.height);
    $(stream_embed).attr("width", videosize.width);
}

var mobile = false;

window.onload = function() {

    $(window).keypress(function( event ) {
    if ( event.which == 109 ) {
        //"m" is pressed
        $("#panel_mapping").toggle();
    }
    });

    //load ustream player api to automatically start the stream
    var viewer = UstreamEmbed('stream');
    setTimeout(function() {
        viewer.callMethod('play');
    }, 5000);

    //resize video stream and digital drawing stream if page gets resized
    $(window).resize(function() {
        resizeCanvas();
    });

    //init drawing stream and mapping panels
    panel_mapping = SVG("panel_mapping");
    panel_drawing = SVG("panel_drawing");

    //connect to io socket
    socket = io('/control');

    socket.on("update-clients", function (data) {

        if(!mapping_loaded && data.tcpclients.length > 0) {
            mapping_loaded = true;
            var id = data.tcpclients[0].id;
            socket.emit("joinMapping", {client: id});
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
        
        $(".participants-num").html(data.httpclients.length);
        $(".viewers-num").html(data.controlclients_num);

        if(data.tcpclients.length == 0) {
            $(".msg").html("Aktuell ist keine Zeichenfläche aktiv. Versuche es später noch einmal oder frag bei <a href='mailto:mail@frauzufall.de'>mail@frauzufall.de</a> nach.");
            $(".msg").removeClass("success");
            $(".msg").addClass("error");
            $(".dimmer-msg").show();
            mapping_loaded = false;
            clearMappingForms();
        }

    });

    socket.on("colorChanged", function (data) {

        setDrawingColor(data.id, data.color);

    });

    socket.on("client-active", function (data) {        
    });

    socket.on("client-gone", function (data) {
        if(typeof drawings[data.id] !== 'undefined') {
            drawings[data.id].remove();
            drawings.splice(drawings.indexOf(data.id),1);
            drawing_markers[data.id].remove();
            drawing_markers.splice(drawing_markers.indexOf(data.id),1);
            drawing_points.splice(drawing_points.indexOf(data.id),1);
        }
    });

    socket.on("updateMappingForm", function (data) {
    });

    socket.on("clearMappingForms", function (data) {
        clearMappingForms();
    });

    socket.on("newMappingForm", function (data) {
     
        polygon = panel_mapping.polygon();

        var pointstring = "";
        for(var i = 0; i < Object.size(data.points); i++) {
            var x = data.points[i].x;
            var y = data.points[i].y;
            pointstring += x + "," + y + " ";
        }
        polygon.plot(pointstring);

        if(data.type === "painting")
            polygon.fill({color:"rgb(0, 100, 200)", opacity: 0.5});
        if(data.type === "picture")
            polygon.fill({color:"rgb(255, 100, 100)", opacity: 0.5});
        if(data.type === "window")
            polygon.fill({color:"rgb(0, 0, 0)", opacity: 0.5});

        mappings.push(polygon);

    });

    socket.on("movedDrawer", function (data) {

        var drawing = getDrawing(data.id);
        var ps = drawing_points[data.id].split(" ");
        while(ps.length > max_drawing_points-1) {
            ps.shift();
        }
        drawing_points[data.id] = ps.join(" ");
        drawing_points[data.id] += data.pos[0] + "," + data.pos[1] + " ";
        drawing.plot(drawing_points[data.id]);
        drawing.stroke({color: data.color, width: 4});
        drawing_markers[data.id].stroke({color: data.color, width: 4});
        drawing_markers[data.id].x(data.pos[0]).y(data.pos[1]);

    });

    socket.on("pulsingDrawer", function (data) {

        var drawing = getDrawing(data.id);
        drawing_markers[data.id].animate().radius(20).after(function(){
            this.animate().radius(5);
        });

    });

    socket.on("mappingSize", function (data) {

        canvassize = data;

        var mapping = document.getElementById("panel_mapping");
        $(mapping).css({"height": canvassize.height, "width": canvassize.width});

        var drawing = document.getElementById("panel_drawing");
        $(drawing).css({"height": canvassize.height, "width": canvassize.width});

        resizeCanvas();
        
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
        }

        clearMappingForms();

    });

    socket.on('disconnect', function () {
        $(".msg").text("Die Verbindung zum Server wurde getrennt.");
        $(".msg").removeClass("success");
        $(".msg").removeClass("error");
        $(".dimmer-msg").show();
    });
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};