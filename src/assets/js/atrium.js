let canvas;
let ctx;
let onlineUsers = 0;
let rowPos = 1;
let rowOffset = 0;
let columnPos = 0;
let request = new XMLHttpRequest();
let atrium;
let activeUsers = [];

const OFFSET_TOP = 200;
const TOKEN_DIAMETER = 60;

let occupied = {
    LOBBY_AREA: false,
    AREA_TWO: false,
    AREA_THREE: false,
    AREA_FOUR: false
}

let LOBBY_AREA;
let AREA_TWO;
let AREA_THREE;
let AREA_FOUR;

function initAtrium() {
canvas = document.getElementById("mycanvas");
ctx = canvas.getContext('2d');

//Quadrants
LOBBY_AREA = [0,canvas.width*.5,OFFSET_TOP,(canvas.height-OFFSET_TOP)*.5];
AREA_TWO = [canvas.width*.5,canvas.width,OFFSET_TOP,(canvas.height-OFFSET_TOP)*.5];
AREA_THREE = [0,canvas.width*.5,(canvas.height+OFFSET_TOP)*.5,canvas.height];
AREA_FOUR = [canvas.width*.5,canvas.width, (canvas.height+OFFSET_TOP)*.5, canvas.height];

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
        if(atrium[room][0]){
            if(atrium[room].length == 1)
            {   
                createAreaGuest(LOBBY_AREA, atrium[room][0]["username"]);
            }
            else{
                for (guest in atrium[room]){
                    if(atrium[room][guest].hasOwnProperty("username")) {
                        createAreaGuest(AREA_TWO,atrium[room][guest]["username"]);
                    }
                }
            }
        }
    }
}

function getRandomColor() {
    color = "hsl(" + Math.random() * 360 + ", 100%, 75%)";
    return color;
}

function createAreaGuest(areaType,userName){
    checkAndSetRowPosition(areaType);
    if(!occupied[areaType])
    {
        ctx.fillStyle = getRandomColor();
        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(areaType[0]+TOKEN_DIAMETER*(rowPos), areaType[2]+columnPos+TOKEN_DIAMETER, TOKEN_DIAMETER/2, TOKEN_DIAMETER/2, 0, 0, 360);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'black'
        ctx.font = "20px Segoe UI";
        ctx.fillText(userName.substring(0,2).toUpperCase(), areaType[0]+TOKEN_DIAMETER*(rowPos)-10, areaType[2]+columnPos+TOKEN_DIAMETER+5)
        onlineUsers++;
        activeUsers.push({username: userName, x: areaType[0]+TOKEN_DIAMETER*(rowPos), y : areaType[2]+columnPos+TOKEN_DIAMETER})
    }
}

function checkAndSetRowPosition(areaCoords){

    if(((rowPos)*TOKEN_DIAMETER) >= areaCoords[1]-TOKEN_DIAMETER) {
        rowOffset += rowPos;
        rowPos = 1;
        columnPos+=TOKEN_DIAMETER;
        if(((columnPos)) >= areaCoords[3]-TOKEN_DIAMETER) {
            console.log(columnPos+ "," + TOKEN_DIAMETER);
            occupied[areaCoords] = true;
        }
    }
    else{
        rowPos = onlineUsers+1 - rowOffset;
    }
}

function removeAreaGuest(){
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(activeUsers[activeUsers.length-1].x, activeUsers[activeUsers.length-1].y, TOKEN_DIAMETER/2, TOKEN_DIAMETER/2, 0, 0, 360);
        ctx.fill();
        ctx.stroke();
        onlineUsers++;
        activeUsers.pop();
}