var socket;

var canvassize = {x: 0, y: 0};

var drawings = new Array();
var drawing_points = new Array();

var mappings = new Array();

var panel_mapping, panel_drawing;

var mapping_loaded = false;

function getDrawing(id) {
    if(typeof drawings[id] === 'undefined') {
        var line = panel_drawing.polyline().fill("none").stroke({ width: 1 });
        drawings[id] = line;
        drawing_points[id] = "";
    }
    return drawings[id];
}

function setDrawingColor(id, _color) {
    var drawing = getDrawing(id);
    drawing.stroke({color: _color, width: 1});
}

var mobile = false;

window.onload = function() {

    panel_mapping = SVG("panel_mapping");
    panel_drawing = SVG("panel_drawing");

    socket = io('/control');

    socket.on("update-clients", function (data) {
        
        // //remove event handlers
        // $(".startmapping").off();
        // $("#tcp-clients").empty();
        // //populate list
        // $.each(data.tcpclients, function(a, obj) {
        //     $('#tcp-clients').append("<li clientid='" + obj.id + "'><span>" + obj.id + "</span> <span class='startmapping'>mapping</span></li>");
        // });
        // //update list item count
        // $(".projections-num").html("("+data.tcpclients.length+")");
        // //attach event handler to mapping link
        // $(".startmapping").on("click", function() {
        //     var id = $(this).parent("li").attr("clientid");
        //     socket.emit("joinMapping", {client: id});
        //     showMapping();
        // })

        if(!mapping_loaded && data.tcpclients.length > 0) {
            var id = data.tcpclients[0].id;
            socket.emit("joinMapping", {client: id});
        }
        
        //$("#web-clients").empty();
        // $.each(data.httpclients, function(a, obj) {
        //     $('#web-clients').append("<li class='webclient-"+identify(obj.id)+"'><span>" + obj.id + "</span></li>");
        //     var client = $(".webclient-"+identify(obj.id));
        //     client.css({color: obj.color});
        // });
        $(".participants-num").html(data.httpclients.length);

    });

    socket.on("colorChanged", function (data) {

        $(".webclient-"+identify(data.id)).css({color: data.color});
        setDrawingColor(data.id, data.color);

    });

    socket.on("client-active", function (data) {

        var client = $(".webclient-"+identify(data.id));

        client.fadeOut(300, function() {
            $(this).fadeIn(300);
        });
        
    });

    socket.on("updateMappingForm", function (data) {
    });

    socket.on("clearMappingForms", function (data) {
        panel_mapping.clear();
        while (mappings.length > 0) { mappings.pop(); }
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
        drawing.stroke({color: data.color, width: 1});
        drawing_points[data.id] += data.pos[0] + "," + data.pos[1] + " ";
        drawing.plot(drawing_points[data.id]);

    });

    socket.on("mappingSize", function (data) {

        canvassize = data;
        var mapping = document.getElementById("panel_mapping");
        $(mapping).css({"height": canvassize.height, "width": canvassize.width});

        var drawing = document.getElementById("panel_drawing");
        $(drawing).css({"height": canvassize.height, "width": canvassize.width});

        var stream = document.getElementById("stream");
        $(stream).attr("height", canvassize.height);
        $(stream).attr("width", canvassize.width);
        var stream_embed = document.getElementById("stream_embed");
        $(stream_embed).attr("height", canvassize.height);
        $(stream_embed).attr("width", canvassize.width);
        
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

    });
}

function identify(val) {
    return val;
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};