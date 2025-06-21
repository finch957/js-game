import { getData } from '../core/data-loader.js';
import { Coord } from '../core/utils.js';
import { MOVE_INTERPOLATION_DURATION } from '../core/constants.js';

export class Entity {
    #position;
    #type;
    #spriteName
    #facingLeft = false;
    #from = null;
    #to = null;
    #t = 1;
    #offset;
    #path = [];
    #health;
    #maxHealth;
    #damage;
    #defense;

    constructor(type, coord) {
        this.#type = type;
        this.#position = coord;
        this.#offset = new Coord(0, 0);
        const data = getData('entity', type);
        this.#spriteName = data.sprite;
        this.#maxHealth = data.health;
        this.#health = this.#maxHealth;
        this.#damage = data.damage;
        this.#defense = data.defense;
    }

    getType() {
        return this.#type;
    }

    getSpriteName() {
        return this.#spriteName;
    }

    isFacingLeft() {
        return this.#facingLeft;
    }

    getDefense() {
        return this.#defense;
    }

    takeDamage(amount) {
        const reduction = Math.round(Math.random() * this.getDefense());
        const finalDamage = Math.max(0, amount - reduction);

        this.#health -= finalDamage;
        if (this.#health < 0) this.#health = 0;
        return finalDamage;
    }

    heal(amount) {
        this.#health = Math.min(this.#health + amount, this.#maxHealth);
    }

    isDead() {
        return this.#health <= 0;
    }

    getHealth() {
        return this.#health;
    }

    getMaxHealth() {
        return this.#maxHealth;
    }

    getDamage() {
        return this.#damage;
    }

    setPosition(newPosition) {
        this.#position = newPosition;
    }

    getPosition() {
        return this.#position;
    }

    getPath() {
        return this.#path;
    }

    setPath(newPath) {
        if (newPath && newPath.length > 0 && newPath[0].equals(this.#position)) {
            newPath.shift();
        }
        this.#path = newPath;
    }

    clearPath() {
        this.#path = [];
    }

    getOffset() {
        return this.#offset;
    }

    isMoving() {
        return (this.#path && this.#path.length > 0) || this.#to !== null;
    }

    getDrawPosition() {
        return this.#position.add(this.#offset);
    }

    resetMovement() {
        this.#path = [];
        this.#from = null;
        this.#to = null;
        this.#t = 1;
        this.#offset = new Coord(0, 0);
    }

    moveTo(newPosition, level) {
        const targetEntity = level.getEntityAt(newPosition);

        if (targetEntity && targetEntity.getType?.() == 'player') {
            this.attackEntity(targetEntity, level);
            return false;
        }

        this.setPosition(newPosition);

        const structure = level.getStructure(newPosition);
        if (structure && structure.isInteractable()) {
            structure.interact(this, level, newPosition);
        }

        return true;
    }

    advanceMovement(level, deltaTime) {
        if (!this.isMoving()) return false;

        if (this.#t >= 1) {
            this.#from = this.#position;
            this.#t = 0;
            this.#to = this.#path.shift();
            if (!this.moveTo(this.#to, level)) {
                this.resetMovement();
                return true;
            }
        }

        if (!this.#to) return;

        this.#t += deltaTime / MOVE_INTERPOLATION_DURATION;

        if (this.#t >= 1) {
            this.#t = 1;
            this.#offset = new Coord(0, 0);
            if (this.#to.x < this.#from.x) this.#facingLeft = true;
            else if (this.#to.x > this.#from.x) this.#facingLeft = false;
            this.#from = null;
            this.#to = null;
        } else {
            this.#offset = Coord.lerp(this.#from.subtract(this.#to), new Coord(0, 0), this.#t);
        }

        return true;
    }

    attackEntity(victim, level) {
        const finalDamage = victim.takeDamage(this.getDamage());
        if (finalDamage > 0) {
            level.addParticle({
                text: finalDamage,
                color: '#a53030',
                position: victim.getPosition().add(new Coord(0.5, 0)),
                offset: new Coord(0, -0.5),
                startOpacity: 1,
                endOpacity: 0,
                lifetime: 0.8
            });
        }
        if (victim.isDead()) {
            if (victim.getType() != 'player') {
                level.removeMob(victim);
            }
        }
    }

}