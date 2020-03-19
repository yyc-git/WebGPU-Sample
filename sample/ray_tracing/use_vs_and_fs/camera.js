import { vec3 } from '../../../utils/matrix.js';


// var camera = (function () {
// }());

// exports.init = camera.init;
// exports.computeCameraUniformData = camera.computeCameraUniformData;
// exports.getLookFrom = camera.getLookFrom;
// exports.getTarget = camera.getTarget;


// Object.defineProperty(exports, '__esModule', { value: true });

var _phi = Math.PI / 2;
var _theta = Math.PI / 2;
var _target = [0.0, 0.0, 0.0];
var _rotateSpeed = 1;
// var _movementSpeedX = 1;
// var _movementSpeedY = 1;
var _wheelSpeed = 1;
var _distance = 30;
var _minDistance = 0.05;

var _isDrag = false;


function _getMovementDelta(e) {
    return [e.movementX, e.movementY];
}

function _changeOrbit(e) {
    var [x, y] = _getMovementDelta(e);

    _phi += x / (100 / _rotateSpeed);
    _theta -= y / (100 / _rotateSpeed);
}

function _bindDragStartEvent(canvas) {
    canvas.onmousedown = (e) => {
        _isDrag = true;
        canvas.requestPointerLock();
    };
}

function _bindDragOverEvent(canvas) {
    canvas.onmousemove = (e) => {
        if (!_isDrag) {
            return;
        }

        _changeOrbit(e);
    };
}

function _bindDragDropEvent(canvas) {
    canvas.onmouseup = (e) => {
        _isDrag = false;
        document.exitPointerLock();
    };
}


export function init(canvas) {
    _bindDragStartEvent(canvas);
    _bindDragOverEvent(canvas);
    _bindDragDropEvent(canvas);
};

export function getLookFrom() {
    return [
        _distance * Math.cos(_phi) * Math.sin(_theta) + _target[0],
        _distance * Math.cos(_theta) + _target[1],
        _distance * Math.sin(_phi) * Math.sin(_theta) + _target[2],
    ]
};

export function getTarget() {
    return _target
};

export function computeCameraUniformData(lookFrom, lookAt, up, fovy, aspect) {
    var theta = fovy * Math.PI / 180.;
    var half_height = Math.tan(theta / 2.);
    var half_width = half_height * aspect;
    var w = vec3.normalize(vec3.create(),
        vec3.subtract(
            vec3.create(),
            lookFrom, lookAt
        )
    );
    var u = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), up, w));
    var v = vec3.cross(vec3.create(), w, u);

    return [
        lookFrom,
        vec3.scale(
            vec3.create(),
            u,
            2.0 * half_width
        ),
        vec3.scale(
            vec3.create(),
            v,
            2.0 * half_height
        ),
        vec3.subtract(
            vec3.create(),
            vec3.subtract(
                vec3.create(),
                vec3.subtract(
                    vec3.create(),
                    lookFrom,
                    vec3.scale(
                        vec3.create(),
                        u,
                        half_width
                    ),
                ),
                vec3.scale(
                    vec3.create(),
                    v,
                    half_height
                ),
            ),
            w
        )
    ];
};