/**
 * QuestManager — data-driven quest system with objective tracking.
 *
 * Quests are defined inline (QUESTS array). Each quest has:
 *   - id, title, description
 *   - objectives: array of { type, target, count? }
 *   - reward: { xp?, gold?, unlockZone? }
 *
 * Objective types:
 *   'visit_zone'  — enter a specific zone
 *   'kill'        — defeat N enemies of a type (or any)
 *   'talk_npc'    — approach a specific NPC
 *   'reach_level' — player spawn level >= N
 */

const QUESTS = [
    {
        id: 'q_explore_north',
        title: 'Explore the North',
        description: 'Visit the Fairy Tree beyond the North Path.',
        objectives: [
            { type: 'visit_zone', target: 'The Fairy Tree' }
        ],
        reward: { xp: 50 },
        giver: 'Elder Marin'
    },
    {
        id: 'q_cave_expedition',
        title: 'Into Darkhollow',
        description: 'Brave Darkhollow Cave to the west.',
        objectives: [
            { type: 'visit_zone', target: 'Darkhollow Cave' }
        ],
        reward: { xp: 50 },
        giver: 'Bram'
    },
    {
        id: 'q_first_blood',
        title: 'Prove Your Strength',
        description: 'Defeat 10 enemies in the wilds.',
        objectives: [
            { type: 'kill', target: 'any', count: 10 }
        ],
        reward: { xp: 100 },
        giver: 'Guard Tomas'
    },
    {
        id: 'q_bridge_repair',
        title: 'The Broken Bridge',
        description: 'Reach spawn level 3 to gather materials, then visit the bridge.',
        objectives: [
            { type: 'reach_level', target: 3 },
            { type: 'visit_zone', target: 'Broken Bridge' }
        ],
        reward: { unlockZone: 'east_bridge' },
        giver: 'Smith Dorn'
    },
    {
        id: 'q_slayer',
        title: 'Slayer of Beasts',
        description: 'Defeat 50 enemies total.',
        objectives: [
            { type: 'kill', target: 'any', count: 50 }
        ],
        reward: { xp: 200 },
        giver: 'Lira'
    }
];

export class QuestManager {
    constructor() {
        this.quests = QUESTS;
        this.active = [];           // Quest IDs the player has accepted
        this.completed = [];        // Quest IDs fully finished
        this.progress = {};         // { questId: { objectiveIndex: currentCount } }
        this.killCount = 0;         // Total kills this run
        this.visitedZones = new Set();
        this.talkedNPCs = new Set();
    }

    /** Start a quest by ID (if not already active or complete). */
    accept(questId) {
        if (this.active.includes(questId) || this.completed.includes(questId)) return false;
        const quest = this.quests.find(q => q.id === questId);
        if (!quest) return false;
        this.active.push(questId);
        this.progress[questId] = {};
        return true;
    }

    /** Auto-accept all quests (for quest givers). */
    acceptAll() {
        for (const quest of this.quests) {
            this.accept(quest.id);
        }
    }

    /** Record a zone visit. */
    visitZone(zoneName) {
        this.visitedZones.add(zoneName);
    }

    /** Record an enemy kill. */
    recordKill(enemyType) {
        this.killCount++;
    }

    /** Record talking to an NPC. */
    talkToNPC(npcName) {
        this.talkedNPCs.add(npcName);
    }

    /**
     * Check and update all active quests.
     * Returns array of newly completed quest objects (for reward processing).
     */
    update(spawnLevel) {
        const newlyCompleted = [];

        for (const questId of [...this.active]) {
            const quest = this.quests.find(q => q.id === questId);
            if (!quest) continue;

            let allDone = true;
            for (let i = 0; i < quest.objectives.length; i++) {
                const obj = quest.objectives[i];
                if (!this._isObjectiveMet(obj, spawnLevel)) {
                    allDone = false;
                    break;
                }
            }

            if (allDone) {
                this.active = this.active.filter(id => id !== questId);
                this.completed.push(questId);
                newlyCompleted.push(quest);
            }
        }

        return newlyCompleted;
    }

    _isObjectiveMet(obj, spawnLevel) {
        switch (obj.type) {
            case 'visit_zone':
                return this.visitedZones.has(obj.target);
            case 'kill':
                return this.killCount >= (obj.count || 1);
            case 'talk_npc':
                return this.talkedNPCs.has(obj.target);
            case 'reach_level':
                return spawnLevel >= obj.target;
            default:
                return false;
        }
    }

    /** Get the current objective text for the HUD. */
    getCurrentObjective() {
        if (this.active.length === 0) return 'Explore Millhaven';
        const questId = this.active[0];
        const quest = this.quests.find(q => q.id === questId);
        if (!quest) return null;
        return quest.title + ': ' + quest.description;
    }

    /** Get serializable save data. */
    getSaveData() {
        return {
            active: [...this.active],
            completed: [...this.completed],
            killCount: this.killCount,
            visitedZones: Array.from(this.visitedZones),
            talkedNPCs: Array.from(this.talkedNPCs)
        };
    }

    /** Restore from save data. */
    loadSaveData(data) {
        if (!data) return;
        if (data.active) this.active = data.active;
        if (data.completed) this.completed = data.completed;
        if (data.killCount !== undefined) this.killCount = data.killCount;
        if (data.visitedZones) this.visitedZones = new Set(data.visitedZones);
        if (data.talkedNPCs) this.talkedNPCs = new Set(data.talkedNPCs);
    }
}
