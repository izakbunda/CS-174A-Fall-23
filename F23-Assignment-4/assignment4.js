import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

const {Cube, Axis_Arrows, Textured_Phong} = defs

export class Assignment4 extends Scene {
    /**
     *  **Base_scene** is a Scene that can be added to any display canvas.
     *  Setup the shapes, materials, camera, and lighting here.
     */
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // TODO:  Create two cubes, including one with the default texture coordinates (from 0 to 1), and one with the modified
        //        texture coordinates as required for cube #2.  You can either do this by modifying the cube code or by modifying
        //        a cube instance's texture_coords after it is already created.
        this.shapes = {
            box_1: new Cube(),
            box_2: new Cube(),
            axis: new Axis_Arrows()
        }
        console.log(this.shapes.box_1.arrays.texture_coord)


        // TODO:  Create the materials required to texture both cubes with the correct images and settings.
        //        Make each Material from the correct shader.  Phong_Shader will work initially, but when
        //        you get to requirements 6 and 7 you will need different ones.
        this.materials = {
            phong: new Material(new Textured_Phong(), {
                color: hex_color("#ffffff"),
            }),
            star_texture: new Material(new Texture_Rotate(), {
                color: hex_color("#000000"),
                ambient: 1,
                texture: new Texture("assets/stars.png", "NEAREST")
            }),
            earth_texture: new Material(new Texture_Scroll_X(), {
                color: hex_color("#000000"),
                ambient: 1,
                texture: new Texture("assets/earth.gif", "LINEAR_MIPMAP_LINEAR" )
            }),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));

        this.box_1_transform = Mat4.translation(-2,0,0);
        this.box_2_transform = Mat4.translation(2,0,0);

        this.is_rotating = false;
    }

    make_control_panel() {
        // TODO:  Implement requirement #5 using a key_triggered_button that responds to the 'c' key.
        this.key_triggered_button("Cube rotation", ["c"], () => {
            this.is_rotating = !this.is_rotating;
        });
    }

    display(context, program_state) {
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(0, 0, -8));
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        const light_position = vec4(10, 10, 10, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        let t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();

        // equivalent for loop
        let texture_coord = this.shapes.box_2.arrays.texture_coord;


        for (let i = 0; i < texture_coord.length; i++) {
            // rotate the pattern by 90 degrees clockwise
            let u = texture_coord[i][0];
            let v = texture_coord[i][1];
            this.shapes.box_2.arrays.texture_coord[i] = vec(u * 2, v * 2);
        }

        // Cube rotation logic
        // 20rpm -> 20/60 -> 1/3 ---> 2pi/3 which means 1 rotation every 3 seconds or 20rpm
        // 30rpm -> 30/60 -> 1/2 ---> 2pi/2 which means 1 rotation every 2 seconds or 30 rpm
        if (this.is_rotating) {
            this.box_1_transform = this.box_1_transform.times(Mat4.rotation((1/3) * 2 * Math.PI * dt, 1, 0, 0))
            this.box_2_transform = this.box_2_transform.times(Mat4.rotation(Math.PI * dt, 0, 1, 0))
        }

        // TODO:  Draw the required boxes. Also update their stored matrices.
        this.shapes.box_1.draw(context, program_state, this.box_1_transform, this.materials.star_texture);
        this.shapes.box_2.draw(context, program_state, this.box_2_transform, this.materials.earth_texture);
    }
}


class Texture_Scroll_X extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #6.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                // // Sample the texture image in the correct place:
                // vec4 tex_color = texture2D( texture, f_tex_coord);
                // if( tex_color.w < .01 ) discard;
                
                // Sample the texture image in the correct place:
                float t_x =  2.0 * mod(animation_time, 1.0); 
                
                // | 1 0 0 t_x |
                // | 0 1 0 t_y |
                // | 0 0 1 t_z |
                // | 0 0 0  1  |
                mat4 scroll_transformation = mat4(vec4(-1.0, 0, 0, 0), 
                                                  vec4( 0, 1.0, 0, 0), 
                                                  vec4( 0, 0, 1.0, 0), 
                                                  vec4(t_x, 0, 0, 1.0)); 

                // convert the points into a homogeneous vector
                vec4 new_tex_coord = vec4(f_tex_coord, 0, 0) + vec4(0.0, 0.0, 0, 1.0); 
                
                // so it can be multiplied to the scroll_transformation matrix
                new_tex_coord = scroll_transformation * new_tex_coord; 
                
                // new_tex_coord is a 4x1 matrix
                // f_tex_coord is a 2x1 matrix
                vec4 tex_color = texture2D(texture, new_tex_coord.xy);
                
                // black out wrt to the scaled tex corrd
                float u = mod(new_tex_coord.x, 1.0);
                float v = mod(new_tex_coord.y, 1.0);
                // float distance_to_center = sqrt(pow(u - 0.5, 2.0) + pow(v - 0.5, 2.0));
                // if (distance_to_center > 0.3 && distance_to_center < 0.4) {
                //     tex_color = vec4(0, 0, 0, 1.0);
                // }
                
                // left edge
                 if (u > 0.15 && u < 0.25 && v > 0.15 && v < 0.85) {
                     tex_color = vec4(0, 0, 0, 1.0);
                 }
                // right edge
                 if (u > 0.75 && u < 0.85 && v > 0.15 && v < 0.85) {
                     tex_color = vec4(0, 0, 0, 1.0);
                 }
                // bottom edge
                 if (v > 0.15 && v < 0.25 && u > 0.15 && u < 0.85) {
                     tex_color = vec4(0, 0, 0, 1.0);
                 }
                // top edge
                 if (v > 0.75 && v < 0.85 && u > 0.15 && u < 0.85) {
                     tex_color = vec4(0, 0, 0, 1.0);
                 }

                if( tex_color.w < .01 ) discard;
                // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}


class Texture_Rotate extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #7.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            void main(){
                // Sample the texture image in the correct place:
                // vec4 tex_color = texture2D( texture, f_tex_coord );
                // if( tex_color.w < .01 ) discard;
                
                // Sample the texture image in the correct place:
                
                // | cos  sin 0 0 |
                // | sin -cos 0 0 |
                // |  0    0  1 0 |
                // |  0    0  0 1 |
                
                // Unsure about this theta value
                // 15RPM -> 15/60 -> 1/4 ---> 2pi/4 -> pi/2
                // (1/4) * 2 * Math.PI -> (1/2) * Math.PI
                // mod 4 = mod 60/15
                float theta = ( (1.0 / 2.0) * 3.14159265 ) * mod(animation_time, 4.0);
                         
                mat4 rotation_transformation = mat4(vec4(cos(theta), sin(theta), 0, 0), 
                                                     vec4(sin(theta), -cos(theta), 0, 0), 
                                                     vec4( 0, 0, 1.0, 0), 
                                                     vec4(0, 0, 0, 1.0)); 
              
                vec4 new_tex_coord = vec4(f_tex_coord, 0, 0)  + vec4(-0.5, -0.5, 0, 0.0);
                new_tex_coord = rotation_transformation * new_tex_coord; 
                new_tex_coord = new_tex_coord + vec4(0.5, 0.5, 0, 0.0);

                // new_tex_coord is a 4x1 matrix
                vec4 tex_color = texture2D(texture, new_tex_coord.xy);
                
                // black out wrt to the scaled tex corrd
                float u = mod(new_tex_coord.x, 1.0);
                float v = mod(new_tex_coord.y, 1.0);
                
                // for circle:
                
                // float distance_to_center = sqrt(pow(u - 0.5, 2.0) + pow(v - 0.5, 2.0));
                // if (distance_to_center > 0.3 && distance_to_center < 0.4) {
                //     tex_color = vec4(0, 0, 0, 1.0);
                // }
                
                 if ((u > 0.15 && u < 0.25) && (v > 0.15 && v < 0.85)) {
                     tex_color = vec4(0, 0, 0, 1.0);
                 }
                 if ((u > 0.75 && u < 0.85) && (v > 0.15 && v < 0.85)) {
                     tex_color = vec4(0, 0, 0, 1.0);
                 }
                 if ((v > 0.15 && v < 0.25) && (u > 0.15 && u < 0.85)) {
                     tex_color = vec4(0, 0, 0, 1.0);
                 }
                 if ((v > 0.75 && v < 0.85) && (u > 0.15 && u < 0.85)) {
                     tex_color = vec4(0, 0, 0, 1.0);
                 }

                if( tex_color.w < .01 ) discard;
                
                // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}

