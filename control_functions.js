var socket = io('/control');

socket.on("update-clients", function (data) {
    
    $("#tcp-clients").empty();
    $.each(data.tcpclients, function(a, obj) {
        $('#tcp-clients').append("<li><span>" + obj.id + "</span></li>");
    });
    $(".projections-num").html("("+data.tcpclients.length+")");
    
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