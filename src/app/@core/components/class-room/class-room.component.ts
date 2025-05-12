// classroom.component.ts
import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-classroom',
  templateUrl: './class-room.component.html',
  styleUrls: ['./class-room.component.scss']
})
export class ClassroomComponent implements OnInit, OnDestroy {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private persons: { group: THREE.Group, color: number, keys: string[], assignedTable: { x: number, z: number }, isActive: boolean, infoIcon: THREE.Mesh, info: { name: string, age: number, favoriteSubject: string } }[] = [];
  private tables: { x: number, z: number, assignedPersonIndex?: number }[] = [];
  private keysPressed: { [key: string]: boolean } = {};
  private animationFrameId!: number;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private currentPersonIndex = -1; // Start with no active person

  // Person info array
  private personInfo = [
    { name: "Alice", age: 15, favoriteSubject: "Math" },
    { name: "Bob", age: 16, favoriteSubject: "Science" },
    { name: "Charlie", age: 14, favoriteSubject: "History" },
    { name: "Diana", age: 15, favoriteSubject: "English" },
    { name: "Eve", age: 16, favoriteSubject: "Art" }
  ];

  // Bindings for Angular template
  selectedPersonName: string = '';
  selectedPersonAge: number = 0;
  selectedPersonSubject: string = '';

  @ViewChild('infoCard') infoCard!: ElementRef;

  ngOnInit() {
    this.initScene();
    this.createClassroom();
    this.setupControls();
    this.setupMouseEvents();
    this.animate();
  }

  ngAfterViewInit() {
    // Ensure info card is hidden initially
    this.infoCard.nativeElement.style.display = 'none';
  }

  ngOnDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('click', this.onMouseClick);
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff); // White background

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 8, 15); // Centered view
    this.camera.lookAt(0, 2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container')?.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 20, 10);
    this.scene.add(directionalLight);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private createClassroom() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x4682b4, side: THREE.DoubleSide }); // Blue floor
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);

    // Walls
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0xf5f5dc }); // Light beige walls
    const panelMaterial = new THREE.MeshBasicMaterial({ color: 0xd2b48c }); // Wooden paneling

    // Back wall (upper)
    const backWallUpper = new THREE.Mesh(new THREE.PlaneGeometry(20, 6), wallMaterial);
    backWallUpper.position.set(0, 7, -10);
    this.scene.add(backWallUpper);
    // Back wall (lower - wooden paneling)
    const backWallLower = new THREE.Mesh(new THREE.PlaneGeometry(20, 4), panelMaterial);
    backWallLower.position.set(0, 2, -10);
    this.scene.add(backWallLower);

    // Left wall (upper)
    const leftWallUpper = new THREE.Mesh(new THREE.PlaneGeometry(20, 6), wallMaterial);
    leftWallUpper.position.set(-10, 7, 0);
    leftWallUpper.rotation.y = Math.PI / 2;
    this.scene.add(leftWallUpper);
    // Left wall (lower)
    const leftWallLower = new THREE.Mesh(new THREE.PlaneGeometry(20, 4), panelMaterial);
    leftWallLower.position.set(-10, 2, 0);
    leftWallLower.rotation.y = Math.PI / 2;
    this.scene.add(leftWallLower);

    // Right wall (upper)
    const rightWallUpper = new THREE.Mesh(new THREE.PlaneGeometry(20, 6), wallMaterial);
    rightWallUpper.position.set(10, 7, 0);
    rightWallUpper.rotation.y = -Math.PI / 2;
    this.scene.add(rightWallUpper);
    // Right wall (lower)
    const rightWallLower = new THREE.Mesh(new THREE.PlaneGeometry(20, 4), panelMaterial);
    rightWallLower.position.set(10, 2, 0);
    rightWallLower.rotation.y = -Math.PI / 2;
    this.scene.add(rightWallLower);

    // Chalkboard
    const chalkboardGeometry = new THREE.PlaneGeometry(10, 3);
    const chalkboardMaterial = new THREE.MeshBasicMaterial({ color: 0x2f4f4f }); // Dark green
    const chalkboard = new THREE.Mesh(chalkboardGeometry, chalkboardMaterial);
    chalkboard.position.set(0, 6, -9.9);
    this.scene.add(chalkboard);

    // Chalkboard frame
    const frameGeometry = new THREE.PlaneGeometry(10.4, 3.4);
    const frameMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 }); // Brown
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 6, -9.95);
    this.scene.add(frame);

    // Door (on right wall)
    const doorGeometry = new THREE.PlaneGeometry(2, 6);
    const doorMaterial = new THREE.MeshBasicMaterial({ color: 0x4682b4 }); // Blue door
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(9.9, 3, 0);
    door.rotation.y = -Math.PI / 2;
    this.scene.add(door);

    // Posters
    const posterMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const poster1 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), posterMaterial);
    poster1.position.set(-3, 8.5, -9.9);
    this.scene.add(poster1);
    const poster2 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), posterMaterial);
    poster2.position.set(3, 8.5, -9.9);
    this.scene.add(poster2);

    // Tables and Chairs
    const tableMaterial = new THREE.MeshBasicMaterial({ color: 0xffff99 }); // Yellow tables
    const chairMaterial = new THREE.MeshBasicMaterial({ color: 0x228b22 }); // Green chairs
    const tableGeometry = new THREE.BoxGeometry(1.5, 0.2, 1);
    const chairGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);

    // Arrange 11 tables with proper spacing
    const spacingX = 2.5; // Horizontal spacing
    const spacingZ = 2.5; // Vertical spacing
    const startX = -6; // Starting x position
    const startZ = -4; // Starting z position

    const tablePositions = [
      // Row 1 (4 tables)
      { x: startX, z: startZ },
      { x: startX + spacingX, z: startZ },
      { x: startX + 2 * spacingX, z: startZ },
      { x: startX + 3 * spacingX, z: startZ },
      // Row 2 (4 tables)
      { x: startX, z: startZ + spacingZ },
      { x: startX + spacingX, z: startZ + spacingZ },
      { x: startX + 2 * spacingX, z: startZ + spacingZ },
      { x: startX + 3 * spacingX, z: startZ + spacingZ },
      // Row 3 (3 tables)
      { x: startX + 0.5 * spacingX, z: startZ + 2 * spacingZ },
      { x: startX + 2 * spacingX, z: startZ + 2 * spacingZ },
      { x: startX + 3.5 * spacingX, z: startZ + 2 * spacingZ }
    ];

    tablePositions.forEach((pos, index) => {
      if (index < 11) {
        // Table
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.position.set(pos.x, 1, pos.z);
        this.scene.add(table);

        // Chair (in front of table)
        const chair = new THREE.Mesh(chairGeometry, chairMaterial);
        chair.position.set(pos.x, 0.4, pos.z - 1);
        this.scene.add(chair);

        // Store table position for assignment logic
        this.tables.push({ x: pos.x, z: pos.z });
      }
    });
  }

  private createPerson() {
    const personConfigs = [
      { color: 0xff0000 }, // Red
      { color: 0x00ff00 }, // Green
      { color: 0x0000ff }, // Blue
      { color: 0x800080 }, // Purple
      { color: 0xffa500 }  // Orange
    ];

    if (this.currentPersonIndex < 4 && this.currentPersonIndex < this.tables.length - 1) {
      this.currentPersonIndex++;
      const config = personConfigs[this.currentPersonIndex];
      const person = new THREE.Group();

      // Body
      const bodyGeometry = new THREE.BoxGeometry(0.5, 1, 0.3);
      const bodyMaterial = new THREE.MeshBasicMaterial({ color: config.color });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.5;
      person.add(body);

      // Head
      const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
      const headMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1.25;
      person.add(head);

      // Info Icon (small sphere above head)
      const iconGeometry = new THREE.SphereGeometry(0.1, 16, 16);
      const iconMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Cyan icon
      const infoIcon = new THREE.Mesh(iconGeometry, iconMaterial);
      infoIcon.position.set(0, 1.75, 0); // Above the head
      person.add(infoIcon);

      // Find the next unassigned table
      let assignedTableIndex = -1;
      for (let i = 0; i < this.tables.length; i++) {
        if (!this.tables[i].assignedPersonIndex) {
          assignedTableIndex = i;
          break;
        }
      }

      if (assignedTableIndex !== -1) {
        const assignedTable = this.tables[assignedTableIndex];
        person.position.set(assignedTable.x + 1, 0, assignedTable.z - 1); // Start near the table
        this.scene.add(person);
        this.tables[assignedTableIndex].assignedPersonIndex = this.currentPersonIndex;
        this.persons.push({
          group: person,
          color: config.color,
          keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
          assignedTable: { x: assignedTable.x, z: assignedTable.z },
          isActive: true,
          infoIcon: infoIcon,
          info: this.personInfo[this.currentPersonIndex]
        });

        // Deactivate previous person
        if (this.currentPersonIndex > 0) {
          this.persons[this.currentPersonIndex - 1].isActive = false;
        }
      }
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
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with the mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check for intersections with info icons
    const infoIcons = this.persons.map(person => person.infoIcon);
    const intersects = this.raycaster.intersectObjects(infoIcons);

    if (intersects.length > 0) {
      const clickedIcon = intersects[0].object as THREE.Mesh;
      const person = this.persons.find(p => p.infoIcon === clickedIcon);
      if (person) {
        // Show info card
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
        infoCardElement.style.left = `${x + 20}px`; // Offset to the right
        infoCardElement.style.top = `${y - 50}px`; // Offset above

        // Ensure the card stays within bounds
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
    if (event.code === 'Enter' && this.currentPersonIndex < 4) {
      this.createPerson();
    }
  }

  private onKeyUp(event: KeyboardEvent) {
    this.keysPressed[event.code] = false;
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const speed = 0.1;
    const restrictedRadius = 1; // Distance within which a person cannot enter another person's table

    this.persons.forEach((person, personIndex) => {
      if (person.isActive) {
        let newX = person.group.position.x;
        let newZ = person.group.position.z;

        // Movement based on arrow keys
        if (this.keysPressed['ArrowUp']) newZ -= speed; // Up
        if (this.keysPressed['ArrowDown']) newZ += speed; // Down
        if (this.keysPressed['ArrowLeft']) newX -= speed; // Left
        if (this.keysPressed['ArrowRight']) newX += speed; // Right

        // Boundary checks (room walls)
        newX = Math.max(-9.5, Math.min(9.5, newX));
        newZ = Math.max(-9.5, Math.min(9.5, newZ));

        // Check if the new position is too close to another person's table
        let canMove = true;
        this.tables.forEach((table, tableIndex) => {
          if (table.assignedPersonIndex !== undefined && table.assignedPersonIndex !== personIndex) {
            const dx = newX - table.x;
            const dz = newZ - table.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance < restrictedRadius) {
              canMove = false;
              console.log(`Person ${personIndex + 1} (color: ${person.color.toString(16)}) cannot access table at (${table.x}, ${table.z}) - assigned to Person ${table.assignedPersonIndex + 1}`);
            }
          }
        });

        // Update position if allowed
        if (canMove) {
          person.group.position.set(newX, 0, newZ);
        }
      }
    });

    this.renderer.render(this.scene, this.camera);
  }
}
