import { Entity } from './entity.js';
import { getData } from '../core/data-loader.js';

export class Mob extends Entity {
    #nextUpdateTick;
    #steps = 1;
    #delay = 1;
    #scoreIncrease;
    #fullPath = [];
    #targetPosition = null;
    //#isAggressive = false;
    #dropTableId = null;

    constructor(type, coord) {
        super(type, coord);
        this.#nextUpdateTick = 0;
        const data = getData('entity', type);
        this.#steps = data.steps;
        this.#delay = data.delay;
        this.#scoreIncrease = data.score;
        this.#dropTableId = data.drop;
    }

    takeDamage(amount, level) {
        const finalDamage = super.takeDamage(amount);
        if (this.isDead()) {
            level.removeMob(this);
            level.addPlayerScore(this.#scoreIncrease);
            if (this.#dropTableId) level.generateLootAt(this.getPosition(), this.#dropTableId);
        }
        return finalDamage;
    }

    update(level, player, reserved) {
        const tick = level.getCurrentTick();
        if (tick < this.#nextUpdateTick) return;

        this.#nextUpdateTick = tick + this.#delay;

        let targetPosition = this.#targetPosition;
        let isAggressive;

        const isWalkable = (coord) => {
            const hasBlockingEntity = level.getEntityAt(coord, 'player') != null;
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
        let fullPath = this.#fullPath;
        let needRepath = false;

        if (isAggressive || atTarget || !fullPath || fullPath.length < 1) {
            needRepath = true;
        } else {
            const sliced = fullPath.slice(0, this.#steps + 1);
            for (const coord of sliced) {
                if (!isWalkable(coord)) {
                    targetPosition = null;
                    fullPath = null;
                    needRepath = true;
                    break;
                }
            }
        }

        if (needRepath) {
            if (!isAggressive) {
                targetPosition = null;
                let iterations = 0;
                let bestPath = null;
                let bestTargetPosition = null;
                let closestDistance = Infinity;

                while (iterations++ < 3) {
                    const room = level.getRandomRoom();
                    const candidate = level.getRandomCoordInRoom(room, 1);

                    if (level.isWalkable(candidate)) {
                        const attemptPath = level.findPartialPath(
                            this.getPosition(),
                            candidate,
                            {
                                filter: isWalkable,
                                maxHeuristicFactor: 3,
                                maxIterations: 150
                            }
                        );

                        const last = attemptPath[attemptPath.length - 1];
                        const distToGoal = last.getDistanceTo(candidate);

                        if (distToGoal < closestDistance) {
                            bestPath = attemptPath;
                            bestTargetPosition = candidate;
                            if (distToGoal < 1) break;
                            closestDistance = distToGoal;
                        }
                    }
                }
                targetPosition = bestTargetPosition;
                fullPath = bestPath;

            } else if (isAggressive) {
                fullPath = level.findPartialPath(
                    this.getPosition(),
                    targetPosition,
                    {
                        filter: isWalkable,
                        maxHeuristicFactor: 1.5,
                        maxIterations: 50
                    }
                );
            }
        }

        const path = fullPath.slice(0, this.#steps + 1);
        fullPath = fullPath.slice(this.#steps + 1);

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

        this.#targetPosition = targetPosition;
        this.#fullPath = fullPath;
        this.setPath(path);
    }

}
