let canvas;
let ctx;
let onlineUsers = 0;
let rowPos = 1;
let rowOffset = 0;
let columnPos = 0;
let colors = ['red','green','blue'];
let request = new XMLHttpRequest();
let atrium;

const OFFSET_TOP = 200;
const TOKEN_DIAMETER = 60;

let LOBBY_AREA_FULL = false;
let AREA_TWO_USED = false;
let AREA_THREE_USED = false;
let AREA_FOUR_USED = false;

let LOBBY_AREA;
let AREA_TWO;
let AREA_THREE;
let AREA_FOUR;

function initAtrium() {
canvas = document.getElementById("mycanvas");
ctx = canvas.getContext('2d');

//Quadrants
LOBBY_AREA = [0,canvas.width*.5,OFFSET_TOP,(canvas.height-OFFSET_TOP)*.5];
AREA_TWO = [canvas.width*.5,canvas.width,OFFSET_TOP,canvas.height*.5+OFFSET_TOP];
AREA_THREE = [0,canvas.width*.5,canvas.height*.5+OFFSET_TOP,canvas.height];
AREA_FOUR = [canvas.width*.5,canvas.width, canvas.height*.5+OFFSET_TOP, canvas.height];

init();
}

document.addEventListener('DOMContentLoaded', function() {
    initAtrium();
}, false);

function init() {
    // //top of UI
    // ctx.fillRect(0, OFFSET_TOP, canvas.width, 2);
    // //left of UI
    // ctx.fillRect(0, OFFSET_TOP, 2, canvas.height);
    // //bottom of UI    
    // ctx.fillRect(0, canvas.height-2, canvas.width, 2);
    // //right of UI
    // ctx.fillRect(canvas.width-2, OFFSET_TOP, 2, canvas.height);

    request.open('GET', 'getatrium', true)
    request.onload = function() {
        atrium = JSON.parse(this.response);
    }
    request.send();
}

function addUsers(){
    for(room in atrium){
        createLobbyGuest();
    }
}


function createLobbyGuest(){
    checkAndSetRowPosition();
    if(!LOBBY_AREA_FULL)
    {
        var randomColor = colors[Math.floor(Math.random()*colors.length)];
        ctx.fillStyle = randomColor;
        ctx.beginPath();
        ctx.ellipse(TOKEN_DIAMETER*(rowPos), columnPos+OFFSET_TOP+TOKEN_DIAMETER, TOKEN_DIAMETER/2, TOKEN_DIAMETER/2, 0, 0, 360);
        ctx.fill();
        ctx.stroke();
        onlineUsers++;
    }
}

function checkAndSetRowPosition(){

    if(((rowPos)*TOKEN_DIAMETER) >= LOBBY_AREA[1]-TOKEN_DIAMETER) {
        rowOffset += rowPos;
        rowPos = 1;
        columnPos+=TOKEN_DIAMETER;
        if(((columnPos)) >= LOBBY_AREA[3]-TOKEN_DIAMETER) {
            console.log(columnPos+ "," + TOKEN_DIAMETER);
            LOBBY_AREA_FULL = true;
        }
    }
    else{
        rowPos = onlineUsers+1 - rowOffset;
    }
}