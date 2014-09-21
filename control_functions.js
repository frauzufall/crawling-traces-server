var socket = io();

socket.on("update-clients", function(data){
    console.log("update-clients");
    $("#tcp-clients").empty();
    $.each(data.tcpclients, function(a, obj) {
        $('#tcp-clients').append("<li><span>" + obj + "</span><a href=\"#\">control</a></li>");
    });
    $("#web-clients").empty();
    $.each(data.webclients, function(a, obj) {
        $('#web-clients').append("<li><span>" + obj + "</span></li>");
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
