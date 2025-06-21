import { Coord } from '../core/utils.js';

export class Particle {
    constructor({
        text,
        color = '#ffffff',
        position,
        offset = new Coord(0, 0),
        startOpacity = 1,
        endOpacity = 1,
        startSize = 0.5,
        endSize = 0.5,
        lifetime = 1
    }) {
        this.text = text;
        this.color = color;
        this.startPosition = position;
        this.offset = offset;
        this.startOpacity = startOpacity;
        this.endOpacity = endOpacity;
        this.startSize = startSize;
        this.endSize = endSize;
        this.lifetime = lifetime;

        this.age = 0;
    }

    update(deltaTime) {
        this.age += deltaTime;
    }

    isAlive() {
        return this.age < this.lifetime;
    }

    getProgress() {
        return Math.min(this.age / this.lifetime, 1);
    }

    getCurrentPosition() {
        return Coord.lerp(this.startPosition, new Coord(
            this.startPosition.x + this.offset.x,
            this.startPosition.y + this.offset.y
        ), this.getProgress());
    }

    getCurrentOpacity() {
        return this.startOpacity + (this.endOpacity - this.startOpacity) * this.getProgress();
    }

    getCurrentSize() {
        return this.startSize + (this.endSize - this.startSize) * this.getProgress();
    }
}

export class ParticleManager {
    constructor() {
        this.particles = [];
    }

    addParticle(config) {
        this.particles.push(new Particle(config));
    }

    update(deltaTime) {
        this.particles = this.particles.filter(p => {
            p.update(deltaTime);
            return p.isAlive();
        });
    }

}
