// ============================================================
// FICTIONAL NAME POOLS BY NATIONALITY
// ============================================================

const FIRST_NAMES: Record<string, string[]> = {
  England: ["Harry", "John", "Jack", "George", "James", "Thomas", "Charlie", "Oliver", "William", "Daniel"],
  France: ["Pierre", "Jean", "Lucas", "Hugo", "Antoine", "Clément", "Mathieu", "Théo", "Nicolas", "Alexandre"],
  Spain: ["Diego", "Carlos", "Javier", "Álvaro", "Sergio", "Manuel", "Alejandro", "Pablo", "Mateo", "Adrián"],
  Germany: ["Lukas", "Felix", "Maximilian", "Jonas", "Leon", "Tobias", "Alexander", "Philipp", "Simon", "Sebastian"],
  Italy: ["Lorenzo", "Francesco", "Alessandro", "Leonardo", "Mattia", "Andrea", "Gabriele", "Riccardo", "Tommaso", "Giuseppe"],
  Brazil: ["Thiago", "Lucas", "Gabriel", "Mateus", "Felipe", "Bruno", "Rafael", "Rodrigo", "Diego", "Gustavo"],
  Argentina: ["Lautaro", "Joaquín", "Mateo", "Santiago", "Ignacio", "Nicolás", "Julián", "Bautista", "Valentín", "Tomas"],
  Portugal: ["João", "Gonçalo", "Diogo", "Duarte", "Afonso", "Rodrigo", "Martim", "Francisco", "Miguel", "Pedro"],
  Netherlands: ["Sven", "Luuk", "Daan", "Thijs", "Milan", "Bram", "Sem", "Stijn", "Jesse", "Lars"],
};

const LAST_NAMES: Record<string, string[]> = {
  England: ["Smith", "Jones", "Taylor", "Brown", "Williams", "Wilson", "Johnson", "Davies", "Robinson", "Wright"],
  France: ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau"],
  Spain: ["García", "Fernández", "González", "Rodríguez", "López", "Martínez", "Sánchez", "Pérez", "Gómez", "Díaz"],
  Germany: ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann"],
  Italy: ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco"],
  Brazil: ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes"],
  Argentina: ["González", "Rodríguez", "López", "Gómez", "Fernández", "Díaz", "Álvarez", "Pérez", "Romero", "Sánchez"],
  Portugal: ["Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues", "Martins", "Jesus", "Pinto"],
  Netherlands: ["de Jong", "de Vries", "van de Berg", "van Dijk", "Bakker", "Janssen", "Visser", "Smit", "Meijer", "Bos"],
};

/**
 * Sinh một cái tên hư cấu (first + last name) ngẫu nhiên theo quốc gia.
 */
export function generateFictionalName(nationality: string): string {
  const firsts = FIRST_NAMES[nationality] ?? FIRST_NAMES["England"];
  const lasts = LAST_NAMES[nationality] ?? LAST_NAMES["England"];

  const randomFirst = firsts[Math.floor(Math.random() * firsts.length)];
  const randomLast = lasts[Math.floor(Math.random() * lasts.length)];

  return `${randomFirst} ${randomLast}`;
}
