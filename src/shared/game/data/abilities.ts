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
        description: 'Al atacar caballería, +1 daño',
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
        description: 'Dificultad 6. Inflige 2 de daño a todos los enemigos adyacentes. Fallo: 1 de daño a todos los adyacentes (excepto generales). No puede ser crítico.',
        restrictions: '1 vez por turno. No puede ser crítico (11-12 hacen daño normal). Afecta a todas las casillas a rango 1.',
    },
    a_la_carga: {
        id: 'a_la_carga', name: 'A la carga', type: 'active',
        description: 'Potencia Cabalgar: avanza 3 casillas en lugar de 2. El coste aumenta con cada uso.',
        restrictions: 'Coste progresivo: +0/+1/+2 (se mantiene en 2). Solo hacia un enemigo.',
    },
    rayo_celestial: {
        id: 'rayo_celestial', name: 'Rayo celestial', type: 'active', cost: 2,
        description: 'Elige un aliado a rango ≤ 2. Su siguiente ataque tiene +3 de ataque',
        restrictions: 'El objetivo debe estar a rango ≤ 2. El efecto se consume tras el ataque.',
        requiresTarget: true,
    },
    ejecutar: {
        id: 'ejecutar', name: 'Ejecutar', type: 'active', cost: 1,
        description: 'Si el enemigo tiene 2 HP o menos, este ataque lo ejecuta si acierta. Puedes ocupar su posición',
        requiresTarget: true,
    },

    // ── IDENTIDAD: INSPIRACIÓN REAL ──
    en_nombre_del_rey: {
        id: 'en_nombre_del_rey', name: 'En nombre del rey', type: 'active', cost: 2,
        description: 'Un aliado a rango ≤ 2 obtiene +2 ataque y escudo 3 HP hasta tu siguiente turno. El General no puede atacar este turno.',
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
        description: 'Si no usaste meditación en tu turno, tu General gana +1 de defensa hasta el próximo turno. Activar: recupera 3 HP a tu General.',
        restrictions: 'El General debe tener al menos 2 PA disponibles y no estar a full HP.',
    },

    // ── IDENTIDAD: SAMURÁI ──
    desenvainado_veloz: {
        id: 'desenvainado_veloz', name: 'Desenvainado veloz', type: 'active', cost: 1,
        description: '-1 dificultad. Si acierta, el objetivo no puede moverse en su siguiente turno (puede atacar). Se resetea si elimina al objetivo.',
        restrictions: '1 vez por turno. Si el hex detrás del objetivo está vacío, puedes ocuparlo al impactar.',
        requiresTarget: true,
    },
    camino_del_guerrero: {
        id: 'camino_del_guerrero', name: 'Camino del guerrero', type: 'passive',
        description: 'Una vez por turno, cuando un aliado elimina a un enemigo a rango 1, recuperas 1 PA.',
    },

    // ── IDENTIDAD: ESCUDO DEL COMANDANTE ──
    angel_guardian: {
        id: 'angel_guardian', name: 'Ángel Guardián', type: 'active', cost: 2,
        description: 'Todos los aliados reciben un escudo de +2 HP y cura 1 HP al aliado (incluye General) que más HP le falte (aleatorio si hay empate).',
    },
    proteger: {
        id: 'proteger', name: 'Proteger', type: 'active', cost: 0,
        description: 'Un aliado a rango ≤ 3 recibe +1 defensa hasta tu siguiente turno. Se acumula con otras defensas. Si no se usa, el efecto va al General.',
        requiresTarget: true,
    },

    // ── IDENTIDAD: FURIA DEL TIRANO ──
    sacrificar: {
        id: 'sacrificar', name: 'Sacrificar', type: 'active', cost: 1,
        description: 'Un aliado a rango 1 pierde 2 HP. El General recupera 3 HP. Si el aliado muere, recupera 5 HP.',
        restrictions: 'No puede usarse si el General está a full HP.',
        requiresTarget: true,
    },
    terror: {
        id: 'terror', name: 'Terror', type: 'passive',
        description: 'Cuando un aliado elimina a un enemigo a rango 1, los enemigos adyacentes al atacante o al objetivo tienen dificultad +1 en su siguiente ataque.',
    },
    robar_ricos: {
        id: 'robar_ricos', name: 'Robar a los ricos', type: 'passive',
        description: 'El primer arquero que acierta cada turno recupera 1 HP',
    },
    acechar: {
        id: 'acechar', name: 'Acechar', type: 'passive',
        description: 'Ataca a unidades aisladas con +1 ataque (+2 si el General ataca a general enemigo). Caballería recibe mitad del bonus',
    },
    hostigar: {
        id: 'hostigar', name: 'Hostigar', type: 'passive',
        description: 'Caballería tiene -1 dificultad al atacar a enemigos con 50% o menos de HP',
    },
    furia_berserker: {
        id: 'furia_berserker', name: 'Furia berserker', type: 'passive',
        description: 'El General y las unidades de infantería tienen +1 de ataque mientras tengan 50% o menos de HP',
    },
    contraataque: {
        id: 'contraataque', name: 'Contraataque', type: 'passive',
        description: 'Cuando el General recibe un ataque de rango 1, inflige 1 daño al atacante',
    },
    liderar_tropas: {
        id: 'liderar_tropas', name: 'Liderar a las tropas', type: 'passive',
        description: 'Cuando el General ataca, la infantería y el General ganan ataque adicional este turno',
    },
    proyeccion: {
        id: 'proyeccion', name: 'Proyección', type: 'passive',
        description: '1 vez por turno, cuando un lancero acierta un ataque cuerpo a cuerpo, hace 1 de daño a las 2 casillas detrás del objetivo',
    },
    lanza_escudo: {
        id: 'lanza_escudo', name: 'Lanza y escudo', type: 'passive',
        description: 'Elige entre +1 rango o +1 defensa para el General cada turno',
    },
    muro_espartano: {
        id: 'muro_espartano', name: 'Muro espartano', type: 'passive',
        description: 'Los lanceros adyacentes entre sí tienen +1 defensa',
    },
    karma: {
        id: 'karma', name: 'Karma', type: 'passive',
        description: 'Cuando una unidad aliada es eliminada, la unidad que la eliminó recibe 2 de daño',
    },
    formacion_linea: {
        id: 'formacion_linea', name: 'Formación línea', type: 'passive',
        description: 'Si hay 3 o más unidades aliadas adyacentes en línea recta, todas reciben +1 defensa',
    },
    formacion_triangulo: {
        id: 'formacion_triangulo', name: 'Formación triángulo', type: 'passive',
        description: 'Si 3 unidades aliadas están adyacentes entre sí, todas tienen ataque +1',
    },
    voz_de_mando: {
        id: 'voz_de_mando', name: 'Voz de mando', type: 'passive',
        description: 'La unidad aliada que se mueve tras el General recibe +1 ataque y +1 defensa',
    },
    plan_batalla: {
        id: 'plan_batalla', name: 'Plan de batalla', type: 'passive',
        description: 'Elige una orden: Avanzar (+1 ataque) o Reagruparse (+1 defensa)',
    },
    guardia_real: {
        id: 'guardia_real', name: 'Guardia real', type: 'passive',
        description: 'Unidades adyacentes al General tienen +1 ataque y +1 defensa',
    },
};

export const CLASS_ABILITIES: Record<UnitClass, string[]> = {
    archer: ['blanco_facil', 'patada_acrobatica', 'fuego_cobertura'],
    cavalry: ['romper_filas', 'cabalgar', 'carga', 'doble_ataque'],
    lancer: ['anti_caballeria', 'formacion_defensiva', 'doble_ataque', 'ventaja_alcance'],
    infantry: ['resistencia', 'linea_defensiva', 'presion', 'ejecutar'],
    general: [],
};
