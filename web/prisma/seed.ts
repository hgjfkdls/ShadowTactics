import { PrismaClient, CosmeticType, Rarity } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const cosmetics: {
    id: string;
    name: string;
    description: string;
    type: CosmeticType;
    rarity: Rarity;
    imageUrl: string;
    price: number;
    attributes: object;
}[] = [
    // Tableros
    { id: 'board-classic', name: 'Tablero Clásico', description: 'El tablero original de hierba y piedra', type: 'BOARD', rarity: 'COMMON', imageUrl: '/cosmetics/board-classic.png', price: 0, attributes: { boardTheme: 'CLASSIC', hexStyle: 'GRASS' } },
    { id: 'board-forest', name: 'Tablero Bosque Encantado', description: 'Un tablero místico rodeado de naturaleza', type: 'BOARD', rarity: 'RARE', imageUrl: '/cosmetics/board-forest.png', price: 80, attributes: { boardTheme: 'ENCHANTED_FOREST', hexStyle: 'STONE' } },
    { id: 'board-desert', name: 'Tablero Desierto', description: 'Arena ardiente y dunas interminables', type: 'BOARD', rarity: 'RARE', imageUrl: '/cosmetics/board-desert.png', price: 80, attributes: { boardTheme: 'DESERT', hexStyle: 'SAND' } },
    { id: 'board-volcano', name: 'Tablero Volcán', description: 'Lava ardiente y cenizas volcánicas', type: 'BOARD', rarity: 'EPIC', imageUrl: '/cosmetics/board-volcano.png', price: 200, attributes: { boardTheme: 'VOLCANO', hexStyle: 'LAVA' } },
    { id: 'board-ice', name: 'Tablero Reino Helado', description: 'Hielo perpetuo y nieve eterna', type: 'BOARD', rarity: 'EPIC', imageUrl: '/cosmetics/board-ice.png', price: 200, attributes: { boardTheme: 'ICE', hexStyle: 'ICE' } },
    { id: 'board-floating', name: 'Tablero Ciudad Flotante', description: 'Un tablero entre las nubes', type: 'BOARD', rarity: 'LEGENDARY', imageUrl: '/cosmetics/board-floating.png', price: 500, attributes: { boardTheme: 'FLOATING_CITY', hexStyle: 'CLOUD' } },
    { id: 'board-cemetery', name: 'Tablero Cementerio Maldito', description: 'Tinieblas y almas en pena', type: 'BOARD', rarity: 'LEGENDARY', imageUrl: '/cosmetics/board-cemetery.png', price: 500, attributes: { boardTheme: 'CEMETERY', hexStyle: 'DARK_STONE' } },
    // Skins
    { id: 'skin-archer-elf', name: 'Arquero Élfico', description: 'Un arquero de los bosques ancestrales', type: 'SKIN', rarity: 'COMMON', imageUrl: '/cosmetics/skin-archer-elf.png', price: 25, attributes: { unitClass: 'ARCHER' } },
    { id: 'skin-archer-dark', name: 'Arquero Oscuro', description: 'Un arquero envuelto en sombras', type: 'SKIN', rarity: 'RARE', imageUrl: '/cosmetics/skin-archer-dark.png', price: 100, attributes: { unitClass: 'ARCHER' } },
    { id: 'skin-archer-ghost', name: 'Arquero Fantasma', description: 'Un espectro que dispara desde el más allá', type: 'SKIN', rarity: 'EPIC', imageUrl: '/cosmetics/skin-archer-ghost.png', price: 250, attributes: { unitClass: 'ARCHER' } },
    { id: 'skin-archer-steampunk', name: 'Arquero Steampunk', description: 'Tecnología y engranajes al servicio del arco', type: 'SKIN', rarity: 'EPIC', imageUrl: '/cosmetics/skin-archer-steampunk.png', price: 250, attributes: { unitClass: 'ARCHER' } },
    { id: 'skin-archer-infernal', name: 'Arquero Infernal', description: 'Forjado en las profundidades del infierno', type: 'SKIN', rarity: 'LEGENDARY', imageUrl: '/cosmetics/skin-archer-infernal.png', price: 600, attributes: { unitClass: 'ARCHER' } },
    { id: 'skin-infantry-imperial', name: 'Infante Imperial', description: 'Soldado de élite del imperio', type: 'SKIN', rarity: 'RARE', imageUrl: '/cosmetics/skin-infantry-imperial.png', price: 100, attributes: { unitClass: 'INFANTRY' } },
    { id: 'skin-cavalry-dark', name: 'Caballero Oscuro', description: 'Un caballero caído en desgracia', type: 'SKIN', rarity: 'EPIC', imageUrl: '/cosmetics/skin-cavalry-dark.png', price: 250, attributes: { unitClass: 'CAVALRY' } },
    { id: 'skin-lancer-abyss', name: 'Lancero del Abismo', description: 'Surgido de las profundidades', type: 'SKIN', rarity: 'EPIC', imageUrl: '/cosmetics/skin-lancer-abyss.png', price: 250, attributes: { unitClass: 'LANCER' } },
    { id: 'skin-general-celestial', name: 'General Celestial', description: 'Un general bendecido por los dioses', type: 'SKIN', rarity: 'LEGENDARY', imageUrl: '/cosmetics/skin-general-celestial.png', price: 600, attributes: { unitClass: 'GENERAL' } },
    // Armas
    { id: 'weapon-crystal', name: 'Arco de Cristal', description: 'Un arco tallado en cristal puro', type: 'WEAPON', rarity: 'RARE', imageUrl: '/cosmetics/weapon-crystal.png', price: 60, attributes: { unitClass: 'ARCHER' } },
    { id: 'weapon-fire', name: 'Arco de Fuego', description: 'Un arco envuelto en llamas eternas', type: 'WEAPON', rarity: 'EPIC', imageUrl: '/cosmetics/weapon-fire.png', price: 180, attributes: { unitClass: 'ARCHER' } },
    { id: 'weapon-bone', name: 'Arco de Hueso', description: 'Forjado con los restos de bestias antiguas', type: 'WEAPON', rarity: 'RARE', imageUrl: '/cosmetics/weapon-bone.png', price: 60, attributes: { unitClass: 'ARCHER' } },
    { id: 'weapon-energy', name: 'Arco de Energía', description: 'Un arco hecho de pura energía arcana', type: 'WEAPON', rarity: 'EPIC', imageUrl: '/cosmetics/weapon-energy.png', price: 180, attributes: { unitClass: 'ARCHER' } },
    { id: 'weapon-light-arrows', name: 'Flechas Luminosas', description: 'Flechas que brillan en la oscuridad', type: 'WEAPON', rarity: 'COMMON', imageUrl: '/cosmetics/weapon-light-arrows.png', price: 20, attributes: { unitClass: 'ARCHER' } },
    // Clima
    { id: 'climate-rain', name: 'Lluvia', description: 'Una lluvia ligera sobre el campo de batalla', type: 'CLIMATE', rarity: 'RARE', imageUrl: '/cosmetics/climate-rain.png', price: 90, attributes: { precipitation: 'RAIN', intensity: 0.5 } },
    { id: 'climate-snow', name: 'Nieve', description: 'Copos de nieve cayendo suavemente', type: 'CLIMATE', rarity: 'EPIC', imageUrl: '/cosmetics/climate-snow.png', price: 200, attributes: { precipitation: 'SNOW', intensity: 0.5 } },
    { id: 'climate-leaves', name: 'Hojas de Otoño', description: 'Hojas secas bailando con el viento', type: 'CLIMATE', rarity: 'COMMON', imageUrl: '/cosmetics/climate-leaves.png', price: 30, attributes: { precipitation: 'LEAVES', intensity: 0.3 } },
    { id: 'climate-ash', name: 'Cenizas Volcánicas', description: 'Cenizas flotando en el aire', type: 'CLIMATE', rarity: 'EPIC', imageUrl: '/cosmetics/climate-ash.png', price: 200, attributes: { precipitation: 'ASH', intensity: 0.4 } },
    { id: 'climate-aurora', name: 'Aurora Boreal', description: 'Luces danzantes en el cielo', type: 'CLIMATE', rarity: 'LEGENDARY', imageUrl: '/cosmetics/climate-aurora.png', price: 450, attributes: { precipitation: 'AURORA', intensity: 1.0 } },
    // Perfil
    { id: 'frame-bronze', name: 'Marco Bronce', description: 'Un marco sencillo de bronce', type: 'PROFILE_FRAME', rarity: 'COMMON', imageUrl: '/cosmetics/frame-bronze.png', price: 15, attributes: { frameStyle: 'STATIC' } },
    { id: 'frame-silver', name: 'Marco Plata', description: 'Un marco elegante de plata', type: 'PROFILE_FRAME', rarity: 'COMMON', imageUrl: '/cosmetics/frame-silver.png', price: 20, attributes: { frameStyle: 'STATIC' } },
    { id: 'frame-gold', name: 'Marco Oro', description: 'Un marco dorado y brillante', type: 'PROFILE_FRAME', rarity: 'RARE', imageUrl: '/cosmetics/frame-gold.png', price: 70, attributes: { frameStyle: 'STATIC' } },
    { id: 'frame-diamond', name: 'Marco Diamante', description: 'Un marco con partículas brillantes', type: 'PROFILE_FRAME', rarity: 'EPIC', imageUrl: '/cosmetics/frame-diamond.png', price: 200, attributes: { frameStyle: 'ANIMATED', particles: true } },
    { id: 'frame-legendary', name: 'Marco Legendario', description: 'El marco más prestigioso', type: 'PROFILE_FRAME', rarity: 'LEGENDARY', imageUrl: '/cosmetics/frame-legendary.png', price: 500, attributes: { frameStyle: 'ANIMATED', particles: true, glow: true } },
    { id: 'title-master-archer', name: 'Título Arquero Maestro', description: 'Demuestra tu destreza con el arco', type: 'TITLE', rarity: 'RARE', imageUrl: '/cosmetics/title-master-archer.png', price: 80, attributes: { displayText: 'Arquero Maestro' } },
    { id: 'title-general', name: 'Título General', description: 'Lidera tus ejércitos a la victoria', type: 'TITLE', rarity: 'RARE', imageUrl: '/cosmetics/title-general.png', price: 80, attributes: { displayText: 'General' } },
    { id: 'title-grand-strategist', name: 'Título Estratega Supremo', description: 'Nadie supera tu inteligencia táctica', type: 'TITLE', rarity: 'EPIC', imageUrl: '/cosmetics/title-grand-strategist.png', price: 200, attributes: { displayText: 'Estratega Supremo' } },
    { id: 'title-realm-guardian', name: 'Título Guardián del Reino', description: 'Protector de los reinos', type: 'TITLE', rarity: 'LEGENDARY', imageUrl: '/cosmetics/title-realm-guardian.png', price: 350, attributes: { displayText: 'Guardián del Reino' } },
    // Social
    { id: 'emote-wave', name: 'Saludo', description: 'Saluda a tu oponente', type: 'EMOTE', rarity: 'COMMON', imageUrl: '/cosmetics/emote-wave.png', price: 25, attributes: { animation: 'WAVE', sound: 'greeting.wav' } },
    { id: 'emote-clap', name: 'Aplauso', description: 'Reconoce una buena jugada', type: 'EMOTE', rarity: 'COMMON', imageUrl: '/cosmetics/emote-clap.png', price: 25, attributes: { animation: 'CLAP', sound: 'clap.wav' } },
    { id: 'emote-taunt', name: 'Burla', description: 'Un gesto provocador', type: 'EMOTE', rarity: 'RARE', imageUrl: '/cosmetics/emote-taunt.png', price: 60, attributes: { animation: 'TAUNT', sound: 'taunt.wav' } },
    { id: 'pet-dragon', name: 'Dragón Pequeño', description: 'Un dragón diminuto que te acompaña', type: 'PET', rarity: 'EPIC', imageUrl: '/cosmetics/pet-dragon.png', price: 220, attributes: { model: 'DRAGON', scale: 0.5, animations: ['idle', 'fly'] } },
    { id: 'pet-fox', name: 'Zorro Mágico', description: 'Un zorro místico de luz', type: 'PET', rarity: 'EPIC', imageUrl: '/cosmetics/pet-fox.png', price: 220, attributes: { model: 'FOX', scale: 0.6, animations: ['idle', 'run'] } },
];

const endOfMonth = new Date();
endOfMonth.setMonth(endOfMonth.getMonth() + 1);

const discounts: { id: string; discountPercent: number; discountEndsAt: Date }[] = [
    { id: 'board-volcano', discountPercent: 25, discountEndsAt: endOfMonth },
    { id: 'skin-archer-infernal', discountPercent: 30, discountEndsAt: endOfMonth },
    { id: 'climate-aurora', discountPercent: 20, discountEndsAt: endOfMonth },
    { id: 'frame-gold', discountPercent: 50, discountEndsAt: endOfMonth },
];

async function main() {
    for (const c of cosmetics) {
        await prisma.cosmetic.upsert({
            where: { id: c.id },
            update: {},
            create: { ...c, discountPercent: 0, discountEndsAt: null },
        });
    }

    for (const d of discounts) {
        await prisma.cosmetic.update({
            where: { id: d.id },
            data: { discountPercent: d.discountPercent, discountEndsAt: d.discountEndsAt },
        });
    }

    console.log(`Seed completado: ${cosmetics.length} cosméticos, ${discounts.length} con descuento`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
