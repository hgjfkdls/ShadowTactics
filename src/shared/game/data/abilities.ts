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
    patada_acrobatica: {
        id: 'patada_acrobatica', name: 'Patada acrobática', type: 'active', cost: 1,
        description: 'Si el arquero está adyacente a un enemigo, hace 1 de daño y se mueve a una casilla adyacente no ocupada que no esté adyacente al enemigo',
        restrictions: 'Requiere enemigo adyacente y casilla de escape disponible',
        requiresTarget: true,
    },
    fuego_cobertura: {
        id: 'fuego_cobertura', name: 'Fuego de cobertura', type: 'active', cost: 2,
        description: 'Si impacta, inflige 2 de daño y el objetivo tiene coste +1 en su próximo turno (max 2 acciones)',
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
        description: 'Reemplaza el ataque básico. Ataque a rango +1',
        restrictions: 'No puede combinarse con Doble ataque. Reemplaza el ataque básico',
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
    cabalgar_2: {
        id: 'cabalgar_2', name: 'Cabalgar', type: 'active', cost: 1,
        description: 'Avanza 2-3 casillas contiguas. Al finalizar, puedes usar Carga.',
    },
    torbellino: {
        id: 'torbellino', name: 'Torbellino', type: 'active', cost: 3,
        description: 'Inflige 2 de daño a todos los enemigos adyacentes y 1 de daño a los aliados adyacentes. Ignora defensas.',
        restrictions: '1 vez por turno. Afecta a todas las casillas a rango 1.',
    },
    a_la_carga: {
        id: 'a_la_carga', name: 'A la carga', type: 'active',
        description: 'Potencia Cabalgar: avanza 3 casillas en lugar de 2. El coste aumenta con cada uso.',
        restrictions: 'Coste progresivo: +0/+1/+2 (se mantiene en 2). Solo hacia un enemigo.',
    },
    rayo_celestial: {
        id: 'rayo_celestial', name: 'Rayo celestial', type: 'active', cost: 1,
        description: 'Elige un aliado a rango ≤ 2 que tenga rango 1. Su siguiente ataque hace +X daño (X: 3/2/1 según usos)',
        restrictions: 'Cada uso reduce el daño en 1. Se desactiva tras el tercer uso.',
        requiresTarget: true,
    },
    avance: {
        id: 'avance', name: 'Avance', type: 'passive',
        description: 'Al eliminar un enemigo con ataque básico, permite ocupar su posición',
    },

    // ── IDENTIDAD: INSPIRACIÓN REAL ──
    en_nombre_del_rey: {
        id: 'en_nombre_del_rey', name: 'En nombre del rey', type: 'active', cost: 2,
        description: 'Un aliado a rango ≤ 2 obtiene ataque 5 y escudo 3 HP hasta tu siguiente turno. El General no puede atacar este turno.',
        restrictions: '2 PA. El General queda marcado como atacado.',
        requiresTarget: true,
    },

    // ── IDENTIDAD: CORAZÓN DE ESTRATEGA ──
    posicion_estrategica: {
        id: 'posicion_estrategica', name: 'Posición estratégica', type: 'active', cost: 0,
        description: 'Mueve a tu General 1 casilla a una posición adyacente a un aliado',
        restrictions: '1 vez por turno. El destino debe estar adyacente a un aliado.',
    },

    // ── IDENTIDAD: MONJE SHAOLIN ──
    meditacion: {
        id: 'meditacion', name: 'Meditación', type: 'active', cost: 2,
        description: 'Recupera 3 HP a tu General. Sin límite de usos por turno.',
        restrictions: 'El General debe tener al menos 2 PA disponibles.',
    },
};

export const CLASS_ABILITIES: Record<UnitClass, string[]> = {
    archer: ['blanco_facil', 'patada_acrobatica', 'fuego_cobertura', 'accion_evasiva'],
    cavalry: ['romper_filas', 'cabalgar', 'carga', 'doble_ataque'],
    lancer: ['anti_caballeria', 'formacion_defensiva', 'doble_ataque', 'ventaja_alcance'],
    infantry: ['resistencia', 'linea_defensiva', 'presion', 'avance'],
    general: [],
};
