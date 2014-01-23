var MSGHUB_PUBSUB_URL = 'https://pubsub.msghub.io';

var grid = 5;
var canvas, context, canvaso, contexto;
var paint_buffer = [];

function draw(x1, y1, x2, y2) {
    context.fillStyle = "#000000";
    context.lineWidth = grid;
    context.lineCap = 'round';
    context.moveTo(x1 * grid, y1 * grid);
    context.lineTo(x2 * grid, y2 * grid);
    context.stroke();
}

function save_buffer() {
    while (paint_buffer.length > 1) msghub.save('draw', paint_buffer.splice(0, 30));
}

function send_draw(x1, y1, x2, y2) {
    msghub.publish('draw', {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2}, false);
    paint_buffer.push({'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2});
//    msghub.save('draw', {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2});
}

function recv_draw(channel, data) {
    draw(data.x1, data.y1, data.x2, data.y2);
}

function send_clear() {
    msghub.publish('clear', {}, false);
    msghub.erase('draw', {});
}

function recv_clear(channel, data) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.beginPath();
}

var msghub = new MsgHub(MSGHUB_PUBSUB_URL);
msghub.subscribe('draw', recv_draw);
msghub.subscribe('clear', recv_clear);


// Keep everything in anonymous function, called on window load.
if(window.addEventListener) {
window.addEventListener('load', function () {

  // The active tool instance.
  var tool;
//  var tool_default = 'pencil';

  function init () {
    container = document.getElementById('container');
    canvas = document.createElement('canvas');
    if (!canvas) {
      alert('Error: I cannot create a new canvas element!');
      return;
    }

    canvas.id     = 'imageTemp';
    canvas.width  = 400;
    canvas.height = 300;
    canvas.style.position = "absolute";
    canvas.style.border   = "1px solid";
    container.appendChild(canvas);

    context = canvas.getContext('2d');

    tool = new pencil();

    // Attach the mousedown, mousemove and mouseup event listeners.
    canvas.addEventListener('mousedown', ev_canvas, false);
    canvas.addEventListener('mousemove', ev_canvas, false);
    canvas.addEventListener('mouseup',   ev_canvas, false);

    msghub.load('draw', {limit: 100}, function (err, data) {
        for (i = 0; i < data.data.length; i++) {
            var line_list = JSON.parse(data.data[i].message);

            for (j = 0; j < line_list.length; j++) {
                var point = line_list[j];
                draw(point.x1, point.y1, point.x2, point.y2);
            }
        }

        if (data.next) msghub.load('draw', data.next, arguments.callee);
    });
  }

  // The general-purpose event handler. This function just determines the mouse
  // position relative to the canvas element.
  function ev_canvas (ev) {
    if (ev.layerX || ev.layerX == 0) { // Firefox
      ev._x = ev.layerX;
      ev._y = ev.layerY;
    } else if (ev.offsetX || ev.offsetX == 0) { // Opera
      ev._x = ev.offsetX;
      ev._y = ev.offsetY;
    }

    // Call the event handler of the tool.
    var func = tool[ev.type];
    if (func) {
      func(ev);
    }
  }

  // The drawing pencil.
  var pencil = function() {
    var tool = this;
    var pixel_x = 0, pixel_y = 0;
    this.started = false;

    // This is called when you start holding down the mouse button.
    // This starts the pencil drawing.
    this.mousedown = function (ev) {
        context.beginPath();
        context.moveTo(ev._x, ev._y);
        pixel_x = Math.floor(ev._x / grid);
        pixel_y = Math.floor(ev._y / grid);

//        send_draw(pixel_x, pixel_y, pixel_x, pixel_y);

        tool.started = true;
    };

    // This function is called every time you move the mouse. Obviously, it only
    // draws if the tool.started state is set to true (when you are holding down
    // the mouse button).
    this.mousemove = function (ev) {
      var moved = Math.floor(ev._x / grid) != pixel_x || Math.floor(ev._y / grid) != pixel_y;

      if (tool.started && moved) {

          send_draw(pixel_x, pixel_y, Math.floor(ev._x / grid), Math.floor(ev._y / grid));

          pixel_x = Math.floor(ev._x / grid);
          pixel_y = Math.floor(ev._y / grid);
      }
    };

    // This is called when you release the mouse button.
    this.mouseup = function (ev) {
      if (tool.started) {
        tool.mousemove(ev);
        save_buffer();
        tool.started = false;
      }
    };
  };

  init();

}, false); }
