var socket = io('/control');

var canvassize = {x: 0, y: 0};

socket.on("update-clients", function (data) {
    
    //remove event handlers
    $(".startmapping").off();
    $("#tcp-clients").empty();
    //populate list
    $.each(data.tcpclients, function(a, obj) {
        $('#tcp-clients').append("<li clientid='" + obj.id + "'><span>" + obj.id + "</span> <span class='startmapping'>mapping</span></li>");
    });
    //update list item count
    $(".projections-num").html("("+data.tcpclients.length+")");
    //attach event handler to mapping link
    $(".startmapping").on("click", function() {
        var id = $(this).parent("li").attr("clientid");
        socket.emit("joinMapping", {client: id});
        showMapping();
    })
    
    $("#web-clients").empty();
    $.each(data.httpclients, function(a, obj) {
        $('#web-clients').append("<li class='webclient-"+identify(obj.id)+"'><span>" + obj.id + "</span></li>");
        var client = $(".webclient-"+identify(obj.id));
        client.css({color: obj.color});
    });
    $(".participants-num").html("("+data.httpclients.length+")");

});

socket.on("colorChanged", function (data) {

    $(".webclient-"+identify(data.id)).css({color: data.color});

});

socket.on("client-active", function (data) {

    var client = $(".webclient-"+identify(data.id));

    client.fadeOut(300, function() {
        $(this).fadeIn(300);
    });
    
});

socket.on("updateMappingForm", function (data) {
});

socket.on("newMappingForm", function (data) {

    var canvas = document.getElementById("canvas");
    var c2 = canvas.getContext("2d");

    c2.beginPath();

    var first = true;

    for(var i = 0; i < Object.size(data.points); i++) {
        var x = data.points[i].x;
        var y = data.points[i].y;

        if (first) {
            c2.moveTo(x, y);
            first = false;
        } else {
            c2.lineTo(x, y);
        }
    }

    c2.closePath();

    if(data.type === "painting")
        c2.fillStyle = "rgb(0, 100, 200)";
    if(data.type === "picture")
        c2.fillStyle = "rgb(255, 100, 100)";
    if(data.type === "window")
        c2.fillStyle = "rgb(0, 0, 0)";
    c2.fill();

});

socket.on("mappingSize", function (data) {

    canvassize = data;
    var canvas = document.getElementById("canvas");
    $(canvas).height(canvassize.height);
    $(canvas).attr("height", canvassize.height);
    $(canvas).attr("width", canvassize.width);
    var c2 = canvas.getContext("2d");

    c2.clearRect(0, 0, canvassize.width, canvassize.height);
    
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

var mobile = false;

window.onload = function() {

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

function identify(ugly) {
    if(ugly) {
        ugly = ugly.split(".").join("")
        return ugly;
    }
}

function showMapping() {
    //blend out control overview and blend in mapping
    $("#mapping").show();
    $("#main").hide();
    
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};