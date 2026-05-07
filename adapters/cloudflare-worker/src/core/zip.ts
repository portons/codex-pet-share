export function createZip(files: { name: string; data: Uint8Array }[]) {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const { time, date } = dosDateTime(now);

  for (const file of files) {
    const name = new TextEncoder().encode(file.name);
    const crc = crc32(file.data);
    const local = bytes((push) => {
      pushU32(push, 0x04034b50); pushU16(push, 20); pushU16(push, 0); pushU16(push, 0);
      pushU16(push, time); pushU16(push, date); pushU32(push, crc);
      pushU32(push, file.data.length); pushU32(push, file.data.length);
      pushU16(push, name.length); pushU16(push, 0); pushBytes(push, name);
    });
    chunks.push(local, file.data);
    central.push(bytes((push) => {
      pushU32(push, 0x02014b50); pushU16(push, 20); pushU16(push, 20); pushU16(push, 0); pushU16(push, 0);
      pushU16(push, time); pushU16(push, date); pushU32(push, crc);
      pushU32(push, file.data.length); pushU32(push, file.data.length);
      pushU16(push, name.length); pushU16(push, 0); pushU16(push, 0);
      pushU16(push, 0); pushU16(push, 0); pushU32(push, 0); pushU32(push, offset); pushBytes(push, name);
    }));
    offset += local.length + file.data.length;
  }

  const centralSize = central.reduce((total, chunk) => total + chunk.length, 0);
  const end = bytes((push) => {
    pushU32(push, 0x06054b50); pushU16(push, 0); pushU16(push, 0);
    pushU16(push, files.length); pushU16(push, files.length);
    pushU32(push, centralSize); pushU32(push, offset); pushU16(push, 0);
  });
  return concat([...chunks, ...central, end]);
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(value: Date) {
  return {
    time: (value.getHours() << 11) | (value.getMinutes() << 5) | Math.floor(value.getSeconds() / 2),
    date: ((value.getFullYear() - 1980) << 9) | ((value.getMonth() + 1) << 5) | value.getDate()
  };
}

function bytes(write: (push: number[]) => void) {
  const out: number[] = [];
  write(out);
  return new Uint8Array(out);
}

function pushU16(out: number[], value: number) {
  out.push(value & 0xff, (value >>> 8) & 0xff);
}

function pushU32(out: number[], value: number) {
  out.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function pushBytes(out: number[], values: Uint8Array) {
  for (const value of values) out.push(value);
}

function concat(chunks: Uint8Array[]) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
