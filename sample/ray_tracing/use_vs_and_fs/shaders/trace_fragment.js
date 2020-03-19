export const trace_fragment = `#version 450
precision highp float;
precision highp int;

layout(location = 0) in vec2 v_position;
layout(location = 0) out vec4 outColor;


layout(set = 0, binding = 0) uniform Movement {
    float uTime;
} movement;

layout(set = 0, binding = 1) uniform sampler sampler1;
layout(set = 0, binding = 2) uniform texture2D texture1;

layout(set = 0, binding = 3) uniform Camera {
    vec3 origin;
    vec3 horizontal;
    vec3 vertical;
    vec3 lowerLeft;
} camera;


#define NX 900.0
#define NY 450.0

#define FLT_MAX 3.402823466e+38
#define T_MIN .001
#define T_MAX FLT_MAX

#define MAX_HIT_DEPTH 3
#define NUM_SAMPLES 1
#define NUM_SPHERES 3
#define NUM_XYRECTS 1

#define PI 3.141592653589793

vec2 gRandSeed;


// /*
//  * Camera
//  */

// struct Camera {
//     vec3 origin;
//     vec3 horizontal;
//     vec3 vertical;
//     vec3 lowerLeft;
// };



/*
 * Materials
 */

#define LAMBERT 1
#define METAL 2
// #define DIALECTRIC 3
#define DIFFUSE_LIGHT 3


struct Material {
    int type;
    vec3 albedo;
    float fuzz;
};

Material LambertMaterial = Material(
    LAMBERT,
    vec3(0.5),
    0.
);

Material ShinyMetalMaterial = Material(
    METAL,
    vec3(0.8),
    0.01
);


Material DiffuseLightMaterial = Material(
    DIFFUSE_LIGHT,
    vec3(4.0),
    0.
);



/*
 * Sphere handling
 */

struct Sphere {
    vec3 center;
    float radius;
    Material material;
    vec3 color;
};



struct XYRect {
    float x0;
    float x1;
    float y0;
    float y1;
    float k;
    Material material;
};


struct Ray {
    vec3 origin;
    vec3 dir;
};


struct HitRecord {
    float hitT;
    vec3 hitPoint;
    vec3 normal;

    Material material;
    vec3 color;
    vec2 uv;
};


/*
 * Ray handling
 */

vec3 getRayDirection(vec2 vPosition) {
    return camera.lowerLeft + vPosition.x * camera.horizontal + vPosition.y * camera.vertical - camera.origin;
}

vec3 pointOnRay(Ray ray, float t) {
    return ray.origin + t * ray.dir;
}



float random(vec2 co) {
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt = dot(co.xy, vec2(a, b));
    highp float sn = mod(dt, 3.14);

    return fract(sin(sn) * c);
}

float rand() {
    // gRandSeed.x  = fract(sin(dot(gRandSeed.xy + 0., vec2(12.9898, 78.233))) * 43758.5453);
    // gRandSeed.y  = fract(sin(dot(gRandSeed.xy + 0., vec2(12.9898, 78.233))) * 43758.5453);;

    gRandSeed.x = random(gRandSeed);
    gRandSeed.y = random(gRandSeed);

    return gRandSeed.x;
}



// random direction in unit sphere (i.e. lambert brdf)
// from: https://codepen.io/kakaxi0618/pen/BOqvNj
// this uses spherical coords, see:
// https://www.scratchapixel.com/lessons/mathematics-physics-for-computer-graphics/geometry/spherical-coordinates-and-trigonometric-functions

vec3 randomPointInUnitSphere() {
    float phi = 2.0 * PI * rand();
    // random in range [0, 1] => random in range [-1, 1]
    float cosTheta = 2.0 * rand() - 1.0;
    float u = rand();

    float theta = acos(cosTheta);
    float r = pow(u, 1.0 / 3.0);

    // convert from spherical to cartesian
    float x = r * sin(theta) * cos(phi);
    float y = r * sin(theta) * sin(phi);
    float z = r * cos(theta);

    return vec3(x, y, z);
}


vec4 valueTexture(sampler sp, texture2D tex, vec2 uv){
    return texture(sampler2D(tex, sp), uv);
}


vec2 getSphereUv(vec3 p) {
    float phi = atan(p.z, p.x);
    float theta = asin(p.y);

    float xOffsetAngle = 0.; //1.4;
    float yOffsetAngle = 0.;

    float u = 1. - (phi + xOffsetAngle + PI) / (2. * PI);
    float v = (theta + yOffsetAngle + PI / 2.) / PI;

    return vec2(u, v);
}



bool scatter(HitRecord hitRecord, out vec3 attenuation, inout Ray ray) {
    if (hitRecord.material.type == LAMBERT) {
        // get lambertian random reflection direction
        ray.dir = hitRecord.normal + randomPointInUnitSphere();
        attenuation = hitRecord.material.albedo * valueTexture(
            sampler1,
            texture1,
            hitRecord.uv
        ).rgb;

        return true;
    }

    if (hitRecord.material.type == METAL) {
        vec3 reflected = reflect(normalize(ray.dir), hitRecord.normal);
        vec3 dir = reflected + hitRecord.material.fuzz * randomPointInUnitSphere();

        // dot(a, b) > 0 if a and b are pointing "in the same direction"
        if (dot(dir, hitRecord.normal) > 0.) {
            ray.dir = dir;
            attenuation = hitRecord.material.albedo * hitRecord.color;
        }

        return true;
    }

    if (hitRecord.material.type == DIFFUSE_LIGHT) {
        return false;
    }

    return false;
}





bool hitSphere(Ray ray, Sphere sphere, float minHitT, float maxHitT, inout HitRecord hitRecord) {
    vec3 oc = ray.origin - sphere.center;

    float a = dot(ray.dir, ray.dir);
    float b = 2. * dot(oc, ray.dir);
    float c = dot(oc, oc) - sphere.radius * sphere.radius;

    float discriminant = b * b - 4. * a * c;

    if (discriminant > 0.) {
        float t;

        t = (-b - sqrt(discriminant)) / (2. * a);
        if (t < maxHitT && t > minHitT) {
            hitRecord.hitPoint = pointOnRay(ray, t);
            hitRecord.normal = normalize(
                //TODO why / radiuse???
                // (hitRecord.hitPoint - sphere.center) / sphere.radius
                (hitRecord.hitPoint - sphere.center)
            );

            hitRecord.material = sphere.material;
            hitRecord.color = sphere.color;
            hitRecord.hitT = t;
            // hitRecord.uv = getSphereUv(hitRecord.hitPoint);
            hitRecord.uv = getSphereUv(
                (hitRecord.hitPoint - sphere.center) / sphere.radius
            );

            return true;
        }

        t = (-b + sqrt(discriminant)) / (2. * a);
        if (t < maxHitT && t > minHitT) {
            hitRecord.hitPoint = pointOnRay(ray, t);
            hitRecord.normal = normalize(
                //TODO why / radiuse???
                // (hitRecord.hitPoint - sphere.center) / sphere.radius
                (hitRecord.hitPoint - sphere.center)
            );

            hitRecord.material = sphere.material;
            hitRecord.color = sphere.color;
            hitRecord.hitT = t;
            // hitRecord.uv = getSphereUv(hitRecord.hitPoint);
            hitRecord.uv = getSphereUv(
                (hitRecord.hitPoint - sphere.center) / sphere.radius
            );

            return true;
        }
    }

    return false;
}


bool hitXYRect(Ray ray, XYRect xyRect, float minHitT, float maxHitT, inout HitRecord hitRecord) {
    float t = (xyRect.k - ray.origin.z) / ray.dir.z;

    if(t < minHitT || t > maxHitT){
        return false;
    }

    float x = ray.origin.x + t * ray.dir.x;
    float y = ray.origin.y + t * ray.dir.y;

    if(x < xyRect.x0 || x > xyRect.x1 || y < xyRect.y0 || y> xyRect.y1){
        return false;
    }

    hitRecord.uv = vec2(
        (x - xyRect.x0 ) / (xyRect.x1 - xyRect.x0),
        (y - xyRect.y0 ) / (xyRect.y1 - xyRect.y0)
    );
    hitRecord.hitT = t;
    hitRecord.material = xyRect.material;
    hitRecord.hitPoint = pointOnRay(ray, t);
    hitRecord.normal = vec3(0.,0.,1.);

    return true;
}



/*
 * World
 */

bool hitWorld(Ray ray, Sphere spheres[NUM_SPHERES], XYRect xyRects[NUM_XYRECTS], out HitRecord hitRecord) {
    float closest_so_far = T_MAX;
    bool isHit = false;

    for (int i = 0; i < NUM_SPHERES; i++) {
        if (hitSphere(ray, spheres[i], T_MIN, closest_so_far, hitRecord)) {
            isHit = true;
            closest_so_far = hitRecord.hitT;
        }
    }

    for (int i = 0; i < NUM_XYRECTS; i++) {
        if (hitXYRect(ray, xyRects[i], T_MIN, closest_so_far, hitRecord)) {
            isHit = true;
            closest_so_far = hitRecord.hitT;
        }
    }

    return isHit;
}


vec3 background(vec3 rayDir) {
    vec3 normedDir = normalize(rayDir);
    // transpose y range from [-1, 1] to [0, 1]
    float t = .5 * (normedDir.y + 1.);
    // do linear interpolation of color
    return (1. - t) * vec3(1.) + t * vec3(.4, .4, .7); //vec3(.5, .7, 1.);
}


vec4 emitted(Material material, vec2 uv){
    if (material.type == DIFFUSE_LIGHT) {
        return vec4(4.0);
    }

    return vec4(0.0);
}


// colorize
vec3 paint(Ray ray, Sphere spheres[NUM_SPHERES], XYRect xyRects[NUM_XYRECTS]) {
    vec3 color = vec3(1.0);
    vec3 attenuation;
    HitRecord hitRecord;

    for (int hitCounts = 0; hitCounts < MAX_HIT_DEPTH; hitCounts++) {
        bool hasHit = hitWorld(ray, spheres, xyRects, hitRecord);
        if (!hasHit) {
            // color *= background(ray.dir);
            color = vec3(0.0);
            break;
        }

        ray.origin = hitRecord.hitPoint;

        vec3 emittedColor = emitted(hitRecord.material, hitRecord.uv).rgb;

        if(scatter(hitRecord, attenuation, ray)){
            color = emittedColor + color * attenuation;
        }
        else{
            // color = emittedColor + color;
            color *= emittedColor;
            break;
        }
    }

    return color;
}


vec3 trace(Sphere spheres[NUM_SPHERES], XYRect xyRects[NUM_XYRECTS]) {
    vec3 color = vec3(0.0);

    vec2 uResolution = vec2(NX, NY);

    // trace
    for (int i = 0; i < NUM_SAMPLES; i++) {
        vec2 rVPosition = vec2( // jitter for anti-aliasing
            v_position.x + (rand() / uResolution.x),
            v_position.y + (rand() / uResolution.y)
        );

        Ray ray = Ray(camera.origin, getRayDirection(rVPosition));
        color += paint(ray, spheres, xyRects);
    }

    color /= float(NUM_SAMPLES);


    return color;
}

void main() {
    vec3 color;
    // set initial seed for stateful rng
    gRandSeed = v_position;


    Sphere spheres[NUM_SPHERES];
    {
        spheres[0] = Sphere(
            // vec3(-0.1, -0.25 + 0.25*0.5*abs(sin(movement.uTime*3.)), -1.), // sphere center
            vec3(0., -1000., 0.), // sphere center
            1000.,
            LambertMaterial, // material
            vec3(1.) // color
        );
        spheres[1] = Sphere(
            vec3(0., 2.0 + 0.5 * abs(sin(movement.uTime * 2.)), 0.), // sphere center
            2.,
            LambertMaterial, // material
            vec3(1.) // color
        );
        spheres[2] = Sphere(
            vec3(0.0, 10.0, 2.5 * abs(sin(movement.uTime * 4.))), // sphere center
            2.,
            DiffuseLightMaterial, // material
            vec3(1.) // color
        );
    }


    XYRect xyRects[NUM_XYRECTS];
    {
        xyRects[0] = XYRect(
            -5.,
            5.,
            1.,
            3.,
            -3.,
            DiffuseLightMaterial
        );
    }





    color = trace(spheres, xyRects);
    color = sqrt(color); // correct gamma

    outColor = vec4(color, 1.);
}`