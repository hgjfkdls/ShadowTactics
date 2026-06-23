export type UnitClass = 'archer' | 'cavalry' | 'lancer' | 'infantry' | 'general';
export type AbilityType = 'passive' | 'active';

export type UnitAbility = {
    id: string;
    name: string;
    type: AbilityType;
    cost?: number;
    description: string;
    restrictions?: string;
    // Para habilidades activas: requiere elegir un objetivo
    requiresTarget?: boolean;
};

export const ABILITIES: Record<string, UnitAbility> = {
    // ── ARQUERO ──
    blanco_facil: {
        id: 'blanco_facil', name: 'Blanco fácil', type: 'passive',
        description: 'Si el objetivo no se movió el turno anterior, -1 dificultad',
    },
    disparo_rapido: {
        id: 'disparo_rapido', name: 'Disparo rápido', type: 'active', cost: 1,
        description: 'Si el enemigo está a ≤2 de distancia, realiza un segundo ataque con dificultad +1',
        restrictions: 'Solo si el objetivo está a distancia ≤2',
    },
    fuego_cobertura: {
        id: 'fuego_cobertura', name: 'Fuego de cobertura', type: 'active', cost: 2,
        description: 'Si impacta, el objetivo tiene coste +1 en su próximo turno (max 2 acciones)',
        restrictions: '1 vez por turno por arquero, no se acumula',
        requiresTarget: true,
    },
    accion_evasiva: {
        id: 'accion_evasiva', name: 'Acción evasiva', type: 'active', cost: 1,
        description: 'Si hay enemigos adyacentes al inicio del turno, reemplaza al primer movimiento',
    },

    // ── CABALLERÍA ──
    romper_filas: {
        id: 'romper_filas', name: 'Romper filas', type: 'passive',
        description: 'Ignora Resistencia y Línea defensiva de la infantería',
    },
    doble_ataque: {
        id: 'doble_ataque', name: 'Doble ataque', type: 'active', cost: 1,
        description: 'Realiza un segundo ataque contra el mismo objetivo con -1 daño',
        requiresTarget: true,
    },
    cabalgar: {
        id: 'cabalgar', name: 'Cabalgar', type: 'active', cost: 1,
        description: 'Mueve 2 casillas en línea recta. Reemplaza el movimiento normal',
        restrictions: '1 vez por turno',
    },
    carga: {
        id: 'carga', name: 'Carga', type: 'active', cost: 1,
        description: 'Tras Cabalgar, ataque con -1 dificultad y +1 daño en la misma línea recta',
        restrictions: 'Si usa carga, no puede volver a atacar este turno',
        requiresTarget: true,
    },

    // ── LANCERO ──
    anti_caballeria: {
        id: 'anti_caballeria', name: 'Anti-caballería', type: 'passive',
        description: 'Al atacar caballería, +2 daño',
    },
    formacion_defensiva: {
        id: 'formacion_defensiva', name: 'Formación defensiva', type: 'passive',
        description: 'Anula el bono de Carga. Si gana el combate, el atacante recibe +1 daño',
    },
    ventaja_alcance: {
        id: 'ventaja_alcance', name: 'Ventaja de alcance', type: 'active', cost: 1,
        description: 'Un ataque tiene +1 rango',
        restrictions: 'Solo en el primer ataque. No puede usarse con Doble ataque el mismo turno',
        requiresTarget: true,
    },

    // ── INFANTERÍA ──
    resistencia: {
        id: 'resistencia', name: 'Resistencia', type: 'passive',
        description: 'La primera vez que recibes daño en un turno, -1 daño',
    },
    linea_defensiva: {
        id: 'linea_defensiva', name: 'Línea defensiva', type: 'passive',
        description: 'Si no te moviste en tu turno anterior, -1 daño este turno. No se acumula con Resistencia',
    },
    presion: {
        id: 'presion', name: 'Presión', type: 'passive',
        description: 'Si ataca al mismo objetivo que el turno anterior, +1 daño',
    },
    avance: {
        id: 'avance', name: 'Avance', type: 'active', cost: 1,
        description: 'Si elimina a un enemigo, ocupa su posición sin romper Línea defensiva',
        requiresTarget: true,
    },
};

export const CLASS_ABILITIES: Record<UnitClass, string[]> = {
    archer: ['blanco_facil', 'disparo_rapido', 'fuego_cobertura', 'accion_evasiva'],
    cavalry: ['romper_filas', 'doble_ataque', 'cabalgar', 'carga'],
    lancer: ['anti_caballeria', 'formacion_defensiva', 'doble_ataque', 'ventaja_alcance'],
    infantry: ['resistencia', 'linea_defensiva', 'presion', 'avance'],
    general: [],
};
