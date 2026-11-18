/**
 * Hình trang trí vẽ bằng SVG của trang /adult: khung thẻ (AFrame), nhành lá (ASprig / ARule),
 * con dấu ép kim (ASeal). Toạ độ chốt theo bản thiết kế 2026-11-18.
 */

// Khung thiệp: bốn cạnh + bốn góc (SVG, lật gương). Góc trên-trái vẽ trong ô vuông, đường khung
// chạy dọc mép trên y=0.5 và mép trái x=0.5.
//  · wine  (thẻ đỏ hero): bậc thang đôi 40px, chốt phương án 3b (2026-11-18)
//  · paper (thẻ thiệp trắng): nhành lá 72px, chốt phương án 4d (2026-11-18) — hai cành mọc từ góc
//    ôm theo hai cạnh rồi nối vào đường khung, mỗi cành bốn lá to dần về phía góc, cặp tua cuốn
//    ở giữa, chùm ba quả nhỏ. Đối xứng qua đường chéo nên lật gương ra bốn góc vẫn khớp.
const A_WINE = { box: 40, paths: ['M40 0.5H14.5V7.5H7.5V14.5H0.5V40', 'M40 5.5H19.5V12.5H12.5V19.5H5.5V40'] };

// Lá: gốc (x, y), hướng a (độ), dài l, rộng w → viền + gân giữa
function aLeaf(x, y, a, l, w) {
  const r = (a * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const P = (u, v) => `${(x + u * c - v * s).toFixed(2)} ${(y + u * s + v * c).toFixed(2)}`;
  return {
    o: `${x}px ${y}px`,
    outline: `M${P(0, 0)}Q${P(l * 0.42, -w)} ${P(l, 0)}Q${P(l * 0.42, w)} ${P(0, 0)}Z`,
    rib: `M${P(0.6, 0)}Q${P(l * 0.45, -w * 0.12)} ${P(l * 0.8, 0)}`,
  };
}
const A_BRANCH = (() => {
  // Lá trên cành mép trên (từ góc ra); cành mép trái = đối xứng qua đường chéo (x↔y, a → 90 − a)
  const top = [
    [13.5, 5.4, 38, 11, 4.2],
    [20.5, 3.4, -34, 8.5, 3.2],
    [28, 2.2, 28, 9, 3.4],
    [36.5, 1.3, -24, 6.5, 2.5],
  ];
  const leaves = [];
  top.forEach(([x, y, ang, l, w], i) => {
    leaves.push({ i, ...aLeaf(x, y, ang, l, w) });
    leaves.push({ i, ...aLeaf(y, x, 90 - ang, l, w) });
  });
  return {
    box: 72,
    stems: [
      'M7 7C15 3.5 29 1 46 0.5',
      'M7 7C3.5 15 1 29 0.5 46',
      'M8 8C14 12 18 18 17 24C16.5 27 13.5 27.5 13 25',
      'M8 8C12 14 18 18 24 17C27 16.5 27.5 13.5 25 13',
    ],
    leaves,
    berries: [[12.5, 12.5, 1.8], [16.4, 10.6, 1.3], [10.6, 16.4, 1.3], [3.2, 3.2, 1.4]],
  };
})();

// Con dấu HM đầu thẻ thiệp: ép kim (chốt phương án 5c, 2026-11-18). Theo ngón tay: con dấu hạ
// xuống, dập chìm vào giấy (nổi trơn, gần màu giấy), rồi lá vàng phủ từ tâm ra; cuộn lên thì nhấc ra.
export function ASeal() {
  return (
    <div className="a-seal-wrap" data-seal="c" data-sp="" aria-hidden="true">
      <img className="a-seal a-seal-base" src="/assets/medallion-gold.png" alt="" />
      <img className="a-seal a-seal-foil" src="/assets/medallion-gold.png" alt="" />
    </div>
  );
}

// Thêm hình cho thẻ thiệp bớt chữ — chốt 6b + 6c + 6d (2026-11-18):
//  6b khối giờ thành tờ lịch · 6c minh hoạ nét vẽ tay đầu mỗi phần · 6d vạch ❖ thành nhành lá.
//  Bỏ 6a (囍) và 6e (thẻ có ảnh khách sạn).

// Nhành lá ngang (thay vạch ❖): cành mọc từ giữa ra hai bên, lá so le, hạt thoi ở giữa
const A_SPRIG = (() => {
  const leaves = [];
  [[14, 0, 7.5, 3], [26, 1, 6.5, 2.6], [37, 0, 5.5, 2.2], [47, 1, 4.5, 1.8]].forEach(([dx, up, l, w], i) => {
    [1, -1].forEach((side) => {
      const x = 80 + side * dx;
      const y = 12 - (up ? 0.3 : -0.3);
      const ang = side > 0 ? (up ? -38 : 38) : (up ? 218 : 142);
      leaves.push({ i, ...aLeaf(x, y, ang, l, w) });
    });
  });
  return { leaves, stems: ['M80 12C68 12 52 11.4 28 12C22 12.2 16 12.6 12 13', 'M80 12C92 12 108 11.4 132 12C138 12.2 144 12.6 148 13'] };
})();
function ASprig({ cls = '' }) {
  return (
    <svg className={`a-sprig ${cls}`} data-sp="" viewBox="0 0 160 24" aria-hidden="true">
      {A_SPRIG.stems.map((d, i) => <path key={i} className="a-sprig-stem" d={d} pathLength="1" />)}
      {A_SPRIG.leaves.map((lf, n) => (
        <g key={n} className="a-leaf" style={{ '--i': lf.i, transformOrigin: lf.o }}>
          <path className="a-leaf-o" d={lf.outline} />
          <path className="a-leaf-r" d={lf.rib} />
        </g>
      ))}
      <path className="a-sprig-dot" d="M80 8.5L83.5 12L80 15.5L76.5 12Z" />
    </svg>
  );
}
export function ARule({ cls = '' }) {
  const glyph = (extra = '') => <span className={`a-rule a-rule--paper ${cls} ${extra}`} aria-hidden="true" data-sp="">❖</span>;
  // Vạch giữa: điện thoại là vạch ngang (→ nhành lá), desktop là vạch đứng (giữ ❖)
  if (cls.includes('a-rule--mid')) return <><ASprig cls="a-sprig--mob" />{glyph('a-rule--deskonly')}</>;
  return <ASprig cls={cls} />;
}

export function AFrame({ tone = 'wine' }) {
  const paper = tone === 'paper';
  const k = paper ? A_BRANCH : A_WINE;
  return (
    <div className="a-hframe" data-tone={tone} aria-hidden="true">
      {['t', 'r', 'b', 'l'].map((s) => <span key={s} className={`a-hf-e a-hf-${s}`} />)}
      {['tl', 'tr', 'br', 'bl'].map((c) => (
        <svg key={c} className={`a-hf-c a-hf-${c}`} viewBox={`0 0 ${k.box} ${k.box}`}>
          {(paper ? k.stems : k.paths).map((d, i) => <path key={i} d={d} pathLength="1" />)}
          {paper && k.leaves.map((lf, n) => (
            <g key={'l' + n} className="a-leaf" style={{ '--i': lf.i, transformOrigin: lf.o }}>
              <path className="a-leaf-o" d={lf.outline} />
              <path className="a-leaf-r" d={lf.rib} />
            </g>
          ))}
          {paper && k.berries.map(([cx, cy, r], n) => (
            <circle key={'b' + n} className="a-berry" cx={cx} cy={cy} r={r} style={{ '--i': n, transformOrigin: `${cx}px ${cy}px` }} />
          ))}
        </svg>
      ))}
    </div>
  );
}
