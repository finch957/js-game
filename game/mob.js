import { Entity } from './entity.js';
import { getData } from '../core/data-loader.js';

export class Mob extends Entity {
    #nextUpdateTick;
    #steps;
    #delay;
    #scoreIncrease;
    #targetPosition = null;
    #isAggressive = false;

    constructor(type, coord) {
        super(type, coord);
        this.#nextUpdateTick = 0;
        const data = getData('entity', type);
        this.#steps = data.steps;
        this.#delay = data.delay;
        this.#scoreIncrease = data.score;
    }

    getScoreIncrease() {
        return this.#scoreIncrease;
    }

    update(level, player, reserved) {
        const tick = level.getCurrentTick();
        if (tick < this.#nextUpdateTick) return;

        this.#nextUpdateTick = tick + this.#delay;

        let targetPosition = this.#targetPosition;
        let isAggressive = this.#isAggressive;

        const isWalkable = (coord) => {
            const hasBlockingEntity = level.getEntityAt(coord, 'player') !== null;
            const isReserved = reserved.has(coord.toKey());
            return level.isWalkable(coord) && !hasBlockingEntity && !isReserved;
        };

        const rayHit = level.rayCast(this.getPosition(), player.getPosition());

        if (rayHit?.equals(player.getPosition())) {
            targetPosition = player.getPosition();
            isAggressive = true;
        } else {
            isAggressive = false;
        }

        const atTarget = !targetPosition || targetPosition.equals(this.getPosition());

        if (!isAggressive && atTarget) {
            targetPosition = null;
            while (!targetPosition) {
                const room = level.getRandomRoom();
                const candidate = level.getRandomCoordInRoom(room, 1);
                if (level.isWalkable(candidate) && level.findPath(this.getPosition(), candidate, isWalkable)) {
                    targetPosition = candidate;
                }
            }
        }

        const steps = this.#steps;
        let path = level.findPartialPath(this.getPosition(), targetPosition, isWalkable).slice(0, this.#steps + 1);

        if (path.length > 1) {
            const last = path[path.length - 1];
            const isTargetPlayer = last.equals(player.getPosition());

            if (isTargetPlayer && path.length > 2) {
                reserved.add(path[path.length - 2].toKey());
            } else if (!isTargetPlayer) {
                reserved.add(last.toKey());
            } else {
                reserved.add(this.getPosition().toKey());
            }
        } else {
            reserved.add(this.getPosition().toKey());
        }

        this.setPath(path);
    }

}
