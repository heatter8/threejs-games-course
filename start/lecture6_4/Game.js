import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LoadingBar } from '../../libs/LoadingBar.js';

class Game{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
        
		this.clock = new THREE.Clock();

        this.loadingBar = new LoadingBar();
        this.loadingBar.visible = false;

		this.assetsPath = '../../assets/';
        
		this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 50 );
		this.camera.position.set( 1, 1.7, 2.8 );
        
		let col = 0x605550;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( col );
		
		const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
		this.scene.add(ambient);

        const light = new THREE.DirectionalLight(0xFFFFFF, 3);
        light.position.set( 0.2, 1, 1 );
		this.scene.add(light);
			
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
        ;
		container.appendChild( this.renderer.domElement );
        this.setEnvironment();
        
        const controls = new OrbitControls( this.camera, this.renderer.domElement );
        controls.target.set(0, 1, 0);
		controls.update();

        this.loadNPC();
		
		window.addEventListener('resize', this.resize.bind(this) );
        
	}
	
    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
    	this.camera.updateProjectionMatrix();
    	this.renderer.setSize( window.innerWidth, window.innerHeight ); 
    }
    
    setEnvironment(){
        const loader = new RGBELoader().setPath(this.assetsPath);
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        pmremGenerator.compileEquirectangularShader();
        
        const self = this;
        
        loader.load( 'hdr/factory.hdr', ( texture ) => {
          const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
          pmremGenerator.dispose();

          self.scene.environment = envMap;

        }, undefined, (err)=>{
            console.error( err.message );
        } );
    }

    loadNPC(){
    	const loader = new GLTFLoader( ).setPath(`${this.assetsPath}factory/`);
		const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath( '../../libs/three/examples/jsm/libs/draco/gltf/' );
        loader.setDRACOLoader( dracoLoader );
        this.loadingBar.visible = true;
		
		// Load a glTF resource
		loader.load(
			// resource URL
			'swat-guy.glb',
			// called when the resource is loaded
			gltf => {

				this.scene.add( gltf.scene );
                this.eve = gltf.scene;
				this.mixer = new THREE.AnimationMixer( gltf.scene );

				this.animations = {};

				gltf.animations.forEach( animation => {
					this.animations[animation.name.toLowerCase()] = animation;
				});
				
				this.actionName = '';
				this.newAnim();
				
                this.loadingBar.visible = false;
                
                this.renderer.setAnimationLoop( this.render.bind(this) );
			},
			// called while loading is progressing
			xhr => {

				this.loadingBar.progress = (xhr.loaded / xhr.total);
				
			},
			// called when loading has errors
			err => {

				console.error( err );

			}
		);
	}			
    
	newAnim(){
		const keys = Object.keys(this.animations);
		let index;

		do{
			index = Math.floor( Math.random() * keys.length );
		}while(keys[index]==this.actionName);

		this.action = keys[index];

		setTimeout( this.newAnim.bind(this), 3000 );
	}

	set action(name){
		if (this.actionName == name.toLowerCase()) return;
				
		const clip = this.animations[name.toLowerCase()];

		if (clip!==undefined){
			const action = this.mixer.clipAction( clip );
			if (name=='shot'){
				action.clampWhenFinished = true;
				action.setLoop( THREE.LoopOnce );
			}
			action.reset();
			const nofade = this.actionName == 'shot';
			this.actionName = name.toLowerCase();
			action.play();
			if (this.curAction){
				if (nofade){
					this.curAction.enabled = false;
				}else{
					this.curAction.crossFadeTo(action, 0.5);
				}
			}
			this.curAction = action;
		}
	}

	render() {
		const dt = this.clock.getDelta();

		if (this.mixer !== undefined) this.mixer.update(dt);

        this.renderer.render( this.scene, this.camera );

    }
}

export { Game };