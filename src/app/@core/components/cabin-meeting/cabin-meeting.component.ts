import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-cabin-meeting',
  templateUrl: './cabin-meeting.component.html',
  styleUrls: ['./cabin-meeting.component.scss']
})
export class CabinMeetingComponent implements OnInit, OnDestroy, AfterViewInit {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private persons: { group: THREE.Group, color: number, keys: string[], assignedChair: { x: number, z: number }, isActive: boolean, infoIcon: THREE.Mesh, info: { name: string, age: number, favoriteSubject: string }, targetPosition: THREE.Vector3, isMoving: boolean, chairIndex: number, isHost?: boolean }[] = [];
  private chairs: { x: number, z: number, occupied: boolean, chairGroup: THREE.Group, reservedFor?: number, isHostChair?: boolean }[] = [];
  private keysPressed: { [key: string]: boolean } = {};
  private animationFrameId!: number;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private currentPersonIndex = -1;
  private candidates: { name: string, age: number, favoriteSubject: string, contactNo?: string, assigned?: boolean }[] = [];
  private unassignedCandidates: { name: string, age: number, favoriteSubject: string, contactNo: string }[] = [];
  private meetCode: string = '';
  private meetCandidateQuantity: number = 0;
  private hostInfo: { name: string, age: number, favoriteSubject: string, contactNo: string } | null = null;
  private lastKnownRequests: string[] = [];

  selectedPersonName: string = '';
  selectedPersonAge: number = 0;
  selectedPersonSubject: string = '';

  @ViewChild('infoCard') infoCard!: ElementRef;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.meetCode = this.route.snapshot.queryParams['meetId'] || 'defaultMeet';
    this.loadMeetingData();
    this.initScene();
    this.createMeetingRoom();
    this.setupControls();
    this.setupMouseEvents();
    this.checkForNewCandidates();
    this.showManagementModal();
    this.animate();
  }

  ngAfterViewInit() {
    this.infoCard.nativeElement.style.display = 'none';
  }

  ngOnDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('click', this.onMouseClick);
    this.controls.dispose();
  }

  private loadMeetingData() {
    const meetingDataRaw = localStorage.getItem(`newMeet_${this.meetCode}`);
    if (meetingDataRaw) {
      const meetingData = JSON.parse(meetingDataRaw);
      this.meetCandidateQuantity = meetingData.MeetCandidateQuantity || 0;
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`user_`) && key.includes(this.meetCode)) {
        const dataRaw = localStorage.getItem(key);
        if (dataRaw) {
          const data = JSON.parse(dataRaw);
          const contactNo = key.split('_')[1];

          if (key.endsWith('_MeetHoster')) {
            this.hostInfo = { ...data, contactNo };
            this.candidates.push({ ...data, contactNo, assigned: true });
          } else if (key.endsWith('_NewRequest')) {
            this.unassignedCandidates.push({ ...data, contactNo });
          }
        }
      }
    }

    this.candidates = this.candidates.filter(c => c.assigned);
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xd2b48c);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(-5, 8, 8);
    this.camera.lookAt(0, 2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container')?.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 20;
    this.controls.maxPolarAngle = Math.PI / 2;

    const ambientLight = new THREE.AmbientLight(0x404040, 0.7);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(-10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 512;
    directionalLight.shadow.mapSize.height = 512;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    this.scene.add(directionalLight);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private createMeetingRoom() {
    const tileSize = 1;
    const tileCountX = 20;
    const tileCountZ = 20;
    const tileGeometry = new THREE.PlaneGeometry(tileSize * 0.95, tileSize * 0.95);
    const tileMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 }); // Floor tiles grey
    const groutMaterial = new THREE.MeshStandardMaterial({ color: 0x606060 }); // Grout slightly darker grey

    const groutGeometry = new THREE.PlaneGeometry(20, 20);
    const groutPlane = new THREE.Mesh(groutGeometry, groutMaterial);
    groutPlane.rotation.x = Math.PI / 2;
    groutPlane.position.y = -0.01;
    groutPlane.receiveShadow = true;
    this.scene.add(groutPlane);

    for (let x = -tileCountX / 2; x < tileCountX / 2; x++) {
      for (let z = -tileCountZ / 2; z < tileCountZ / 2; z++) {
        const tile = new THREE.Mesh(tileGeometry, tileMaterial);
        tile.rotation.x = Math.PI / 2;
        tile.position.set(x * tileSize + tileSize / 2, 0, z * tileSize + tileSize / 2);
        tile.receiveShadow = true;
        this.scene.add(tile);
      }
    }

    const upperWallMaterial = new THREE.MeshStandardMaterial({ color: 0xF5F5F5 });
    const baseboardMaterial = new THREE.MeshStandardMaterial({ color: 0x4A4A4A });
    const panelLineMaterial = new THREE.MeshStandardMaterial({ color: 0xD3D3D3 });

    const backWallUpper = new THREE.Mesh(new THREE.PlaneGeometry(20, 6), upperWallMaterial);
    backWallUpper.position.set(0, 5, -10);
    this.scene.add(backWallUpper);

    const backWallBase = new THREE.Mesh(new THREE.PlaneGeometry(20, 2), baseboardMaterial);
    backWallBase.position.set(0, 1, -10);
    this.scene.add(backWallBase);

    for (let x = -8; x <= 8; x += 4) {
      const panelLine = new THREE.Mesh(new THREE.BoxGeometry(0.05, 6, 0.05), panelLineMaterial);
      panelLine.position.set(x, 5, -9.99);
      this.scene.add(panelLine);
    }

    const leftWallUpper = new THREE.Mesh(new THREE.PlaneGeometry(20, 6), upperWallMaterial);
    leftWallUpper.position.set(-10, 5, 0);
    leftWallUpper.rotation.y = Math.PI / 2;
    this.scene.add(leftWallUpper);

    const leftWallBase = new THREE.Mesh(new THREE.PlaneGeometry(20, 2), baseboardMaterial);
    leftWallBase.position.set(-10, 1, 0);
    leftWallBase.rotation.y = Math.PI / 2;
    this.scene.add(leftWallBase);

    for (let z = -8; z <= 8; z += 4) {
      const panelLine = new THREE.Mesh(new THREE.BoxGeometry(0.05, 6, 0.05), panelLineMaterial);
      panelLine.position.set(-9.99, 5, z);
      panelLine.rotation.y = Math.PI / 2;
      this.scene.add(panelLine);
    }

    const rightWallUpper = new THREE.Mesh(new THREE.PlaneGeometry(20, 6), upperWallMaterial);
    rightWallUpper.position.set(10, 5, 0);
    rightWallUpper.rotation.y = -Math.PI / 2;
    this.scene.add(rightWallUpper);

    const rightWallBase = new THREE.Mesh(new THREE.PlaneGeometry(20, 2), baseboardMaterial);
    rightWallBase.position.set(10, 1, 0);
    rightWallBase.rotation.y = -Math.PI / 2;
    this.scene.add(rightWallBase);

    for (let z = -8; z <= 8; z += 4) {
      const panelLine = new THREE.Mesh(new THREE.BoxGeometry(0.05, 6, 0.05), panelLineMaterial);
      panelLine.position.set(9.99, 5, z);
      panelLine.rotation.y = -Math.PI / 2;
      this.scene.add(panelLine);
    }

    const windowGeometry = new THREE.PlaneGeometry(3.6, 2.6);
    const windowMaterial = new THREE.MeshBasicMaterial({ color: 0xB0C4DE, transparent: true, opacity: 0.6 });
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

    const leftWindow = new THREE.Mesh(windowGeometry, windowMaterial);
    leftWindow.position.set(-9.9, 4, -5);
    leftWindow.rotation.y = Math.PI / 2;
    this.scene.add(leftWindow);

    const frameThickness = 0.2;
    const leftFrameTop = new THREE.Mesh(new THREE.BoxGeometry(4, frameThickness, frameThickness), frameMaterial);
    leftFrameTop.position.set(-9.91, 5.3, -5);
    leftFrameTop.rotation.y = Math.PI / 2;
    this.scene.add(leftFrameTop);

    const leftFrameBottom = new THREE.Mesh(new THREE.BoxGeometry(4, frameThickness, frameThickness), frameMaterial);
    leftFrameBottom.position.set(-9.91, 2.7, -5);
    leftFrameBottom.rotation.y = Math.PI / 2;
    this.scene.add(leftFrameBottom);

    const leftFrameLeft = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, 3, frameThickness), frameMaterial);
    leftFrameLeft.position.set(-9.91, 4, -3);
    leftFrameLeft.rotation.y = Math.PI / 2;
    this.scene.add(leftFrameLeft);

    const leftFrameRight = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, 3, frameThickness), frameMaterial);
    leftFrameRight.position.set(-9.91, 4, -7);
    leftFrameRight.rotation.y = Math.PI / 2;
    this.scene.add(leftFrameRight);

    const paneDivider = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3, 0.05), frameMaterial);
    paneDivider.position.set(-9.91, 4, -5);
    paneDivider.rotation.y = Math.PI / 2;
    this.scene.add(paneDivider);

    const paneDividerHorizontal = new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 0.05), frameMaterial);
    paneDividerHorizontal.position.set(-9.91, 4, -5);
    paneDividerHorizontal.rotation.y = Math.PI / 2;
    this.scene.add(paneDividerHorizontal);

    const backWindow = new THREE.Mesh(windowGeometry, windowMaterial);
    backWindow.position.set(0, 4, -9.9);
    this.scene.add(backWindow);

    const backFrameTop = new THREE.Mesh(new THREE.BoxGeometry(4, frameThickness, frameThickness), frameMaterial);
    backFrameTop.position.set(0, 5.3, -9.91);
    this.scene.add(backFrameTop);

    const backFrameBottom = new THREE.Mesh(new THREE.BoxGeometry(4, frameThickness, frameThickness), frameMaterial);
    backFrameBottom.position.set(0, 2.7, -9.91);
    this.scene.add(backFrameBottom);

    const backFrameLeft = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, 3, frameThickness), frameMaterial);
    backFrameLeft.position.set(-2, 4, -9.91);
    this.scene.add(backFrameLeft);

    const backFrameRight = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, 3, frameThickness), frameMaterial);
    backFrameRight.position.set(2, 4, -9.91);
    this.scene.add(backFrameRight);

    const backPaneDivider = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3, 0.05), frameMaterial);
    backPaneDivider.position.set(0, 4, -9.91);
    this.scene.add(backPaneDivider);

    const backPaneDividerHorizontal = new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 0.05), frameMaterial);
    backPaneDividerHorizontal.position.set(0, 4, -9.91);
    this.scene.add(backPaneDividerHorizontal);

    const paintingMaterial1 = new THREE.MeshStandardMaterial({ color: 0x4682B4 });
    const paintingMaterial2 = new THREE.MeshStandardMaterial({ color: 0xDAA520 });
    const frameMaterialPainting = new THREE.MeshStandardMaterial({ color: 0x2F2F2F });

    const painting1 = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), paintingMaterial1);
    painting1.position.set(-5, 5, -9.89);
    this.scene.add(painting1);

    const painting1FrameTop = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.05), frameMaterialPainting);
    painting1FrameTop.position.set(-5, 6, -9.88);
    this.scene.add(painting1FrameTop);

    const painting1FrameBottom = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.05), frameMaterialPainting);
    painting1FrameBottom.position.set(-5, 4, -9.88);
    this.scene.add(painting1FrameBottom);

    const painting1FrameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 0.05), frameMaterialPainting);
    painting1FrameLeft.position.set(-6.5, 5, -9.88);
    this.scene.add(painting1FrameLeft);

    const painting1FrameRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 0.05), frameMaterialPainting);
    painting1FrameRight.position.set(-3.5, 5, -9.88);
    this.scene.add(painting1FrameRight);

    const painting2 = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), paintingMaterial2);
    painting2.position.set(-9.89, 5, 5);
    painting2.rotation.y = Math.PI / 2;
    this.scene.add(painting2);

    const painting2FrameTop = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.05), frameMaterialPainting);
    painting2FrameTop.position.set(-9.88, 6, 5);
    painting2FrameTop.rotation.y = Math.PI / 2;
    this.scene.add(painting2FrameTop);

    const painting2FrameBottom = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.05), frameMaterialPainting);
    painting2FrameBottom.position.set(-9.88, 4, 5);
    painting2FrameBottom.rotation.y = Math.PI / 2;
    this.scene.add(painting2FrameBottom);

    const painting2FrameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 0.05), frameMaterialPainting);
    painting2FrameLeft.position.set(-9.88, 5, 6.5);
    painting2FrameLeft.rotation.y = Math.PI / 2;
    this.scene.add(painting2FrameLeft);

    const painting2FrameRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 0.05), frameMaterialPainting);
    painting2FrameRight.position.set(-9.88, 5, 3.5);
    painting2FrameRight.rotation.y = Math.PI / 2;
    this.scene.add(painting2FrameRight);

    // Door with frame, panels, and handle on the right wall
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const doorFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const doorPanelMaterial = new THREE.MeshStandardMaterial({ color: 0xA0522D });
    const handleMaterial = new THREE.MeshStandardMaterial({ color: 0xC0C0C0 });

    // Door frame
    const doorFrameThickness = 0.15;
    const doorFrameTop = new THREE.Mesh(new THREE.BoxGeometry(2.3, doorFrameThickness, doorFrameThickness), doorFrameMaterial);
    doorFrameTop.position.set(9.91, 4.15, 0);
    doorFrameTop.rotation.y = -Math.PI / 2;
    this.scene.add(doorFrameTop);

    const doorFrameBottom = new THREE.Mesh(new THREE.BoxGeometry(2.3, doorFrameThickness, doorFrameThickness), doorFrameMaterial);
    doorFrameBottom.position.set(9.91, 0.15, 0);
    doorFrameBottom.rotation.y = -Math.PI / 2;
    this.scene.add(doorFrameBottom);

    const doorFrameLeft = new THREE.Mesh(new THREE.BoxGeometry(doorFrameThickness, 4, doorFrameThickness), doorFrameMaterial);
    doorFrameLeft.position.set(9.91, 2, 1.075);
    doorFrameLeft.rotation.y = -Math.PI / 2;
    this.scene.add(doorFrameLeft);

    const doorFrameRight = new THREE.Mesh(new THREE.BoxGeometry(doorFrameThickness, 4, doorFrameThickness), doorFrameMaterial);
    doorFrameRight.position.set(9.91, 2, -1.075);
    doorFrameRight.rotation.y = -Math.PI / 2;
    this.scene.add(doorFrameRight);

    // Door with thickness
    const doorGeometry = new THREE.BoxGeometry(0.1, 4, 2);
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(9.9, 2, 0);
    door.rotation.y = -Math.PI / 2; // Facing inward (negative x-direction)
    this.scene.add(door);

    // Door panels
    const doorPanelGeometry = new THREE.BoxGeometry(0.05, 1.5, 1.6);
    const doorPanel1 = new THREE.Mesh(doorPanelGeometry, doorPanelMaterial);
    doorPanel1.position.set(9.89, 3.25, 0);
    doorPanel1.rotation.y = -Math.PI / 2;
    this.scene.add(doorPanel1);

    const doorPanel2 = new THREE.Mesh(doorPanelGeometry, doorPanelMaterial);
    doorPanel2.position.set(9.89, 0.75, 0);
    doorPanel2.rotation.y = -Math.PI / 2;
    this.scene.add(doorPanel2);

    // Door handle
    const handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 16);
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(9.88, 2.5, 0.9); // Handle on the left side when facing the door
    handle.rotation.z = Math.PI / 2;
    handle.rotation.y = -Math.PI / 2;
    this.scene.add(handle);

    const tableGeometry = new THREE.CylinderGeometry(4, 4, 0.2, 32);
    const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(0, 1, 0);
    table.castShadow = true;
    table.receiveShadow = true;
    this.scene.add(table);

    const wheelPositions = [
      { x: -0.35, z: -0.35 }, { x: 0.35, z: -0.35 }, { x: -0.35, z: 0.35 }, { x: 0.35, z: 0.35 }
    ];

    const chairSeatGeometry = new THREE.BoxGeometry(0.8, 0.2, 0.8);
    const chairBackGeometry = new THREE.BoxGeometry(0.8, 1, 0.1);
    const chairWheelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 16);
    const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const hostChairMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });

    const radius = 5;
    for (let i = 0; i < this.meetCandidateQuantity; i++) {
      const angle = (i / this.meetCandidateQuantity) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const chairGroup = new THREE.Group();
      const seat = new THREE.Mesh(chairSeatGeometry, chairMaterial);
      seat.position.set(0, 0.4, 0);
      seat.castShadow = true;
      chairGroup.add(seat);

      const backrest = new THREE.Mesh(chairBackGeometry, chairMaterial);
      backrest.position.set(0, 0.9, -0.35);
      backrest.castShadow = true;
      chairGroup.add(backrest);

      wheelPositions.forEach(wheelPos => {
        const wheel = new THREE.Mesh(chairWheelGeometry, chairMaterial);
        wheel.position.set(wheelPos.x, 0.15, wheelPos.z);
        wheel.rotation.x = Math.PI / 2;
        wheel.castShadow = true;
        chairGroup.add(wheel);
      });

      chairGroup.position.set(x, 0, z);
      chairGroup.rotation.y = angle;
      this.scene.add(chairGroup);
      this.chairs.push({ x, z, occupied: false, chairGroup, reservedFor: i < this.candidates.length ? i : undefined });
    }

    const hostChairGroup = new THREE.Group();
    const hostSeat = new THREE.Mesh(chairSeatGeometry, hostChairMaterial);
    hostSeat.position.set(0, 0.4, 0);
    hostSeat.castShadow = true;
    hostChairGroup.add(hostSeat);

    const hostBackrest = new THREE.Mesh(chairBackGeometry, hostChairMaterial);
    hostBackrest.position.set(0, 0.9, -0.35);
    hostBackrest.castShadow = true;
    hostChairGroup.add(hostBackrest);

    wheelPositions.forEach(wheelPos => {
      const wheel = new THREE.Mesh(chairWheelGeometry, hostChairMaterial);
      wheel.position.set(wheelPos.x, 0.15, wheelPos.z);
      wheel.rotation.x = Math.PI / 2;
      wheel.castShadow = true;
      hostChairGroup.add(wheel);
    });

    hostChairGroup.position.set(0, 0, radius + 1);
    hostChairGroup.rotation.y = Math.PI;
    this.scene.add(hostChairGroup);
    this.chairs.push({ x: 0, z: radius + 1, occupied: false, chairGroup: hostChairGroup, isHostChair: true });

    if (this.hostInfo) {
      this.createPersonForHost();
    }
  }

  private createPersonForHost() {
    if (!this.hostInfo) return;

    const person = new THREE.Group();
    const personConfigs = [
      { color: 0xff0000 }, { color: 0x00ff00 }, { color: 0x0000ff },
      { color: 0x800080 }, { color: 0xffa500 }, { color: 0x000000 }
    ];
    const config = personConfigs[0];

    const torsoGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 16);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: config.color });
    const torso = new THREE.Mesh(torsoGeometry, bodyMaterial);
    torso.position.y = 0.9;
    torso.castShadow = true;
    person.add(torso);

    const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0xFFDAB9 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    head.castShadow = true;
    person.add(head);

    const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 16);
    const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
    leftArm.position.set(-0.3, 0.75, 0);
    leftArm.rotation.z = 0;
    leftArm.castShadow = true;
    person.add(leftArm);
    const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
    rightArm.position.set(0.3, 0.75, 0);
    rightArm.rotation.z = 0;
    rightArm.castShadow = true;
    person.add(rightArm);

    const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 16);
    const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    leftLeg.position.set(-0.15, 0.3, 0);
    leftLeg.castShadow = true;
    person.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    rightLeg.position.set(0.15, 0.3, 0);
    rightLeg.castShadow = true;
    person.add(rightLeg);

    const iconGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const iconMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const infoIcon = new THREE.Mesh(iconGeometry, iconMaterial);
    infoIcon.position.set(0, 1.9, 0);
    person.add(infoIcon);

    const doorPosition = new THREE.Vector3(9, 0, 0); // Updated to match new door location on right wall
    person.position.copy(doorPosition);

    const hostChair = this.chairs.find(chair => chair.isHostChair);
    if (hostChair && !hostChair.occupied) {
      hostChair.occupied = true;
      const targetPosition = new THREE.Vector3(hostChair.x, 0, hostChair.z);
      this.scene.add(person);
      this.persons.push({
        group: person,
        color: config.color,
        keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
        assignedChair: { x: hostChair.x, z: hostChair.z },
        isActive: true,
        infoIcon: infoIcon,
        info: this.hostInfo,
        targetPosition: targetPosition,
        isMoving: true,
        chairIndex: this.chairs.length - 1,
        isHost: true
      });
    }
  }

  private createPerson() {
    const personConfigs = [
      { color: 0xff0000 }, { color: 0x00ff00 }, { color: 0x0000ff },
      { color: 0x800080 }, { color: 0xffa500 }, { color: 0x000000 }
    ];

    if (this.currentPersonIndex < this.meetCandidateQuantity - 1) {
      this.currentPersonIndex++;
      const config = personConfigs[this.currentPersonIndex % personConfigs.length];
      const person = new THREE.Group();

      const torsoGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 16);
      const bodyMaterial = new THREE.MeshBasicMaterial({ color: config.color });
      const torso = new THREE.Mesh(torsoGeometry, bodyMaterial);
      torso.position.y = 0.9;
      torso.castShadow = true;
      person.add(torso);

      const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
      const headMaterial = new THREE.MeshBasicMaterial({ color: 0xFFDAB9 });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1.5;
      head.castShadow = true;
      person.add(head);

      const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 16);
      const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
      leftArm.position.set(-0.3, 0.75, 0);
      leftArm.rotation.z = 0;
      leftArm.castShadow = true;
      person.add(leftArm);
      const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
      rightArm.position.set(0.3, 0.75, 0);
      rightArm.rotation.z = 0;
      rightArm.castShadow = true;
      person.add(rightArm);

      const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 16);
      const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
      leftLeg.position.set(-0.15, 0.3, 0);
      leftLeg.castShadow = true;
      person.add(leftLeg);
      const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
      rightLeg.position.set(0.15, 0.3, 0);
      rightLeg.castShadow = true;
      person.add(rightLeg);

      const iconGeometry = new THREE.SphereGeometry(0.1, 16, 16);
      const iconMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
      const infoIcon = new THREE.Mesh(iconGeometry, iconMaterial);
      infoIcon.position.set(0, 1.9, 0);
      person.add(infoIcon);

      const doorPosition = new THREE.Vector3(9, 0, 0); // Updated to match new door location on right wall
      person.position.copy(doorPosition);

      const assignedChairIndex = this.currentPersonIndex;
      const assignedChair = this.chairs[assignedChairIndex];

      if (assignedChair && assignedChair.reservedFor === this.currentPersonIndex && !assignedChair.occupied) {
        assignedChair.occupied = true;
        const targetPosition = new THREE.Vector3(assignedChair.x, 0, assignedChair.z);
        this.scene.add(person);
        this.persons.push({
          group: person,
          color: config.color,
          keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
          assignedChair: { x: assignedChair.x, z: assignedChair.z },
          isActive: true,
          infoIcon: infoIcon,
          info: this.candidates[this.currentPersonIndex],
          targetPosition: targetPosition,
          isMoving: true,
          chairIndex: assignedChairIndex
        });

        if (this.currentPersonIndex > 0) {
          this.persons[this.currentPersonIndex - 1].isActive = false;
        }
      }
    }
  }

  private checkForNewCandidates() {
    const currentRequests: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`user_`) && key.includes(this.meetCode) && key.endsWith('_NewRequest') && !key.endsWith('_MeetHoster')) {
        currentRequests.push(key);
        if (!this.lastKnownRequests.includes(key)) {
          const dataRaw = localStorage.getItem(key);
          if (dataRaw) {
            const data = JSON.parse(dataRaw);
            const contactNo = key.split('_')[1];
            this.unassignedCandidates.push({ ...data, contactNo });
          }
        }
      }
    }
    this.lastKnownRequests = currentRequests;
    this.showManagementModal();
    setTimeout(() => this.checkForNewCandidates(), 5000);
  }

  private showManagementModal() {
    console.log('=== Meeting Management Modal ===');

    console.log('Hoster:');
    if (this.hostInfo) {
      const hostChair = this.chairs.find(chair => chair.isHostChair);
      console.log(`- ${this.hostInfo.name} (Assigned to Red Chair at (${hostChair?.x}, ${hostChair?.z}))`);
    } else {
      console.log('- No hoster assigned');
    }

    console.log('\nAssigned Candidates:');
    this.persons.filter(p => !p.isHost).forEach(person => {
      console.log(`- ${person.info.name} (Chair ${person.chairIndex} at (${person.assignedChair.x}, ${person.assignedChair.z}))`);
    });

    console.log('\nUnassigned Candidates:');
    this.unassignedCandidates.forEach((candidate, index) => {
      console.log(`- ${candidate.name} (Contact: ${candidate.contactNo})`);
      console.log(`  [ ] Accept (call this.acceptCandidate(${index}))`);
      console.log(`  [ ] Reject (call this.rejectCandidate(${index}))`);
    });

    console.log('==============================');
  }

  acceptCandidate(index: number) {
    const candidate = this.unassignedCandidates[index];
    if (candidate) {
      this.candidates.push({ ...candidate, assigned: true });
      this.unassignedCandidates.splice(index, 1);
      localStorage.removeItem(`user_${candidate.contactNo}_${this.meetCode}_NewRequest`);
      this.createPerson();
      this.showManagementModal();
    }
  }

  rejectCandidate(index: number) {
    const candidate = this.unassignedCandidates[index];
    if (candidate) {
      this.unassignedCandidates.splice(index, 1);
      localStorage.removeItem(`user_${candidate.contactNo}_${this.meetCode}_NewRequest`);
      this.showManagementModal();
    }
  }

  private setupControls() {
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private setupMouseEvents() {
    this.onMouseClick = this.onMouseClick.bind(this);
    window.addEventListener('click', this.onMouseClick);
  }

  private onMouseClick(event: MouseEvent) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const infoIcons = this.persons.map(person => person.infoIcon);
    const intersects = this.raycaster.intersectObjects(infoIcons);
    if (intersects.length > 0) {
      const clickedIcon = intersects[0].object as THREE.Mesh;
      const person = this.persons.find(p => p.infoIcon === clickedIcon);
      if (person) {
        this.selectedPersonName = person.info.name;
        this.selectedPersonAge = person.info.age;
        this.selectedPersonSubject = person.info.favoriteSubject;

        const vector = new THREE.Vector3();
        vector.setFromMatrixPosition(person.group.matrixWorld);
        vector.project(this.camera);

        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = -(vector.y * 0.5 - 0.5) * window.innerHeight;
        const infoCardElement = this.infoCard.nativeElement;
        infoCardElement.style.display = 'block';
        infoCardElement.style.left = `${x + 20}px`;
        infoCardElement.style.top = `${y - 50}px`;

        const cardWidth = infoCardElement.offsetWidth;
        const cardHeight = infoCardElement.offsetHeight;
        if (x + 20 + cardWidth > window.innerWidth) {
          infoCardElement.style.left = `${x - cardWidth - 20}px`;
        }
        if (y - 50 - cardHeight < 0) {
          infoCardElement.style.top = `${y + 20}px`;
        }
      }
    }
  }

  closeInfoCard() {
    this.infoCard.nativeElement.style.display = 'none';
  }

  private onKeyDown(event: KeyboardEvent) {
    this.keysPressed[event.code] = true;
    if (event.code === 'Enter') {
      this.checkForNewCandidates();
    }
  }

  private onKeyUp(event: KeyboardEvent) {
    this.keysPressed[event.code] = false;
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    const speed = 0.05;
    const restrictedRadius = 1;

    this.persons.forEach((person, personIndex) => {
      if (person.isMoving) {
        const currentPosition = person.group.position;
        const direction = person.targetPosition.clone().sub(currentPosition);
        const distance = direction.length();

        if (distance > 0.1) {
          direction.normalize();
          const moveDistance = Math.min(speed, distance);
          currentPosition.add(direction.multiplyScalar(moveDistance));
          person.group.lookAt(person.targetPosition);
        } else {
          person.isMoving = false;
          person.group.position.copy(person.targetPosition);
        }
      }

      if (person.isActive && !person.isMoving) {
        let newX = person.group.position.x;
        let newZ = person.group.position.z;

        if (this.keysPressed['ArrowUp']) newZ -= speed;
        if (this.keysPressed['ArrowDown']) newZ += speed;
        if (this.keysPressed['ArrowLeft']) newX -= speed;
        if (this.keysPressed['ArrowRight']) newX += speed;

        newX = Math.max(-9.5, Math.min(9.5, newX));
        newZ = Math.max(-9.5, Math.min(9.5, newZ));

        let canMove = true;
        this.chairs.forEach((chair, chairIndex) => {
          if (chair.occupied && chairIndex !== person.chairIndex) {
            const dx = newX - chair.x;
            const dz = newZ - chair.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance < restrictedRadius) {
              canMove = false;
              console.log(`Person ${personIndex + 1} cannot access chair at (${chair.x}, ${chair.z}) - occupied`);
            }
          }
        });

        if (canMove) {
          person.group.position.set(newX, 0, newZ);
        }
      }
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
