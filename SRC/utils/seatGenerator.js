export function generateSeatNumbers(seatCapacity, options = {}) {
    const seatsPerRow = options.seatsPerRow && Number(options.seatsPerRow) > 0 ? Number(options.seatsPerRow) : 4;
    const style = options.style || 'alpha';
    const out = [];
    
    if (style === 'numeric') {
      for (let i = 1; i <= seatCapacity; i++) out.push(String(i));
      return out;
    }
    
    const cols = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    let index = 0;
    let row = 1;
    
    while (index < seatCapacity) {
      for (let c = 0; c < seatsPerRow && index < seatCapacity; c += 1) {
        out.push(`${cols[c] || String(c+1)}${row}`);
        index += 1;
      }
      row += 1;
    }
    
    return out;
}