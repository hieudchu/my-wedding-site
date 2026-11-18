/*
 * DỮ LIỆU THẬT — chụp từ Supabase (production) ngày 2026-11-17 bằng tools/fetch-data.mjs.
 * Đây là đúng những gì khách đang thấy. Sửa ở đây để thử bố cục với nội dung dài/ngắn.
 * Trang thật lấy từ database; chủ nhà sửa qua trang admin. Xem DATA-CONTRACT.md.
 *
 *   site_config      — key/value: tên, ngày giờ, địa điểm, mọi đoạn chữ, bản kê ảnh
 *   family_members   — cha mẹ hai bên (side: 'groom' | 'bride')
 *   timeline_events  — các mốc trong ngày cưới
 *
 * Ảnh: site_config.media_manifest liệt kê file; file nằm ở ./media/_opt/ (WebP 480–1600px,
 * đúng thứ khách tải). Nhạc: production có 9 bài, bản này giữ 2.
 */
window.__DB__ = {
  "site_config": [
    {
      "key": "groom_hometown",
      "value": "Hà Nội · Việt Nam",
      "section": "family",
      "label": "Quê chú rể · Groom hometown"
    },
    {
      "key": "groom_bio",
      "value": "",
      "section": "family",
      "label": "Giới thiệu chú rể · Groom bio"
    },
    {
      "key": "groom_name",
      "value": "Chu Đăng Hiếu",
      "section": "general",
      "label": "Tên chú rể · Groom full name"
    },
    {
      "key": "groom_short",
      "value": "Hiếu",
      "section": "general",
      "label": "Tên ngắn chú rể · Groom short name"
    },
    {
      "key": "bride_hometown",
      "value": "Hà Nội · Việt Nam",
      "section": "family",
      "label": "Quê cô dâu · Bride hometown"
    },
    {
      "key": "bride_name",
      "value": "Nguyễn Thu Thiện Minh",
      "section": "general",
      "label": "Tên cô dâu · Bride full name"
    },
    {
      "key": "bride_bio",
      "value": "",
      "section": "family",
      "label": "Giới thiệu cô dâu · Bride bio"
    },
    {
      "key": "info_announce",
      "value": "Trân trọng báo tin",
      "section": "info",
      "label": "Thông báo · Announcement"
    },
    {
      "key": "info_venue_prefix",
      "value": "Tại",
      "section": "info",
      "label": "Tiền tố địa điểm · Venue prefix"
    },
    {
      "key": "rsvp_heading",
      "value": "Trân trọng cảm ơn Quý khách!",
      "section": "rsvp",
      "label": "Tiêu đề · Heading"
    },
    {
      "key": "rsvp_paragraph",
      "value": "Sự hiện diện của Quý khách và gia đình là niềm vinh hạnh lớn cho chúng em trong ngày trọng đại này. Để công tác chuẩn bị được chu đáo, kính mong Quý khách vui lòng xác nhận sự tham dự trước ngày 01.01.2027.",
      "section": "rsvp",
      "label": "Đoạn văn · Paragraph"
    },
    {
      "key": "footer_text",
      "value": "With love · Made for our beloved guests",
      "section": "footer",
      "label": "Footer text"
    },
    {
      "key": "info_announce_en",
      "value": "We joyfully announce our wedding",
      "section": "info",
      "label": "Thông báo (EN) · Announcement EN"
    },
    {
      "key": "bride_short",
      "value": "Minh",
      "section": "general",
      "label": "Tên ngắn cô dâu · Bride short name"
    },
    {
      "key": "couple_groom_full",
      "value": "Đăng Hiếu",
      "section": "hero",
      "label": "Tên chú rể trên thẻ thiệp"
    },
    {
      "key": "wedding_date",
      "value": "2027-01-15",
      "section": "general",
      "label": "Ngày cưới · Wedding date"
    },
    {
      "key": "wedding_time",
      "value": "18:00",
      "section": "general",
      "label": "Giờ cưới · Wedding time"
    },
    {
      "key": "venue_name",
      "value": "Sheraton Hanoi",
      "section": "general",
      "label": "Tên địa điểm · Venue name"
    },
    {
      "key": "venue_address",
      "value": "K5, Vành Đai 1/11 Đ. Xuân Diệu, Tây Hồ, Hà Nội",
      "section": "general",
      "label": "Địa chỉ · Venue address"
    },
    {
      "key": "phone",
      "value": "+84 919229000",
      "section": "general",
      "label": "Số điện thoại · Phone"
    },
    {
      "key": "map_url",
      "value": "https://maps.app.goo.gl/dp3LQbtQZo7iKYSc6",
      "section": "general",
      "label": "Link bản đồ · Map URL"
    },
    {
      "key": "couple_bride_full",
      "value": "Thiện Minh",
      "section": "hero",
      "label": "Tên cô dâu trên thẻ thiệp"
    },
    {
      "key": "gate_tagline",
      "value": "“Cùng nhau đón những hoàng hôn rực rỡ nhất của cuộc đời.”",
      "section": "gate",
      "label": "Câu trích dẫn · Gate tagline"
    },
    {
      "key": "carousel_captions",
      "value": "{}",
      "section": "general",
      "label": ""
    },
    {
      "key": "media_manifest",
      "value": "{\"version\":1,\"folders\":{\"music\":[{\"id\":\"music-bgm.mp3\",\"file\":\"bgm.mp3\",\"v\":1776787609,\"w\":0,\"h\":0,\"caption\":\"\"},{\"id\":\"music-ANH-SANG-CUA-DOI-TOI.mp3\",\"file\":\"ANH-SANG-CUA-DOI-TOI.mp3\",\"v\":1794486405,\"w\":0,\"h\":0,\"caption\":\"ÁNH SÁNG CỦA ĐỜI TÔI\"}],\"carousel\":[{\"id\":\"carousel-L2220806.JPG\",\"file\":\"L2220806.JPG\",\"v\":1794484430,\"w\":2000,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794484430,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794484430,\"d\":{\"x\":31.8,\"y\":47.3,\"z\":1.2},\"m\":null}},{\"id\":\"carousel-L2220840.JPG\",\"file\":\"L2220840.JPG\",\"v\":1794484479,\"w\":2000,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794484479,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794484479,\"d\":{\"x\":50,\"y\":64.3,\"z\":1},\"m\":null}},{\"id\":\"carousel-L2220931.JPG\",\"file\":\"L2220931.JPG\",\"v\":1794484517,\"w\":2000,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794484517,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794484517,\"d\":{\"x\":67.8,\"y\":24.1,\"z\":1.3},\"m\":null}},{\"id\":\"carousel-L2220972.JPG\",\"file\":\"L2220972.JPG\",\"v\":1794484564,\"w\":2000,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794484564,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794484564,\"d\":{\"x\":47.1,\"y\":25,\"z\":1.2},\"m\":{\"x\":50,\"y\":50,\"z\":1.2}}},{\"id\":\"carousel-Portra (8).JPG\",\"file\":\"Portra (8).JPG\",\"v\":1794484606,\"w\":2020,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794484606,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794484606,\"d\":{\"x\":33.3,\"y\":48.5,\"z\":1.1},\"m\":null}},{\"id\":\"carousel-Portra (19).JPG\",\"file\":\"Portra (19).JPG\",\"v\":1794484657,\"w\":2019,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794484657,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794484657,\"d\":{\"x\":0,\"y\":42.6,\"z\":1.2},\"m\":null}},{\"id\":\"carousel-Portra (21).JPG\",\"file\":\"Portra (21).JPG\",\"v\":1794484735,\"w\":2019,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794484735,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794484735,\"d\":{\"x\":50,\"y\":48.6,\"z\":1},\"m\":{\"x\":33.8,\"y\":15.6,\"z\":1.7}}},{\"id\":\"carousel-L2220239.JPG\",\"file\":\"L2220239.JPG\",\"v\":1794484781,\"w\":2000,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794484781,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794484781,\"d\":{\"x\":55.1,\"y\":46.8,\"z\":1.3},\"m\":null}},{\"id\":\"carousel-L2220450.JPG\",\"file\":\"L2220450.JPG\",\"v\":1794484865,\"w\":2000,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794484865,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794484865,\"d\":{\"x\":29,\"y\":50.7,\"z\":1.2},\"m\":null}},{\"id\":\"carousel-L2220474.JPG\",\"file\":\"L2220474.JPG\",\"v\":1794484893,\"w\":2001,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794484893,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794484893,\"d\":{\"x\":21.9,\"y\":55.9,\"z\":1.1},\"m\":null}},{\"id\":\"carousel-L2220486.JPG\",\"file\":\"L2220486.JPG\",\"v\":1794484925,\"w\":2000,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794484925,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794484925,\"d\":{\"x\":29.2,\"y\":58.5,\"z\":1.2},\"m\":null}},{\"id\":\"carousel-L2220731.JPG\",\"file\":\"L2220731.JPG\",\"v\":1794484959,\"w\":2001,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794484959,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794484959,\"d\":{\"x\":42,\"y\":46.2,\"z\":2.3},\"m\":null}},{\"id\":\"carousel-L2220911.JPG\",\"file\":\"L2220911.JPG\",\"v\":1794485036,\"w\":2000,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794485036,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794485036,\"d\":{\"x\":45.6,\"y\":50,\"z\":1.3},\"m\":null}},{\"id\":\"carousel-Portra (16).JPG\",\"file\":\"Portra (16).JPG\",\"v\":1794485116,\"w\":2019,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794485116,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794485116,\"d\":{\"x\":50,\"y\":0,\"z\":1},\"m\":null}},{\"id\":\"carousel-Proimage (20).jpg\",\"file\":\"Proimage (20).jpg\",\"v\":1794485164,\"w\":2019,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794485164,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794485164,\"d\":{\"x\":51.5,\"y\":0,\"z\":1.2},\"m\":null}}],\"portraits\":[{\"id\":\"portraits-groom.jpg\",\"file\":\"groom.jpg\",\"v\":1794485464,\"w\":2000,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794485464,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794485464,\"d\":{\"x\":50,\"y\":32.8,\"z\":1},\"m\":{\"x\":51.9,\"y\":24.1,\"z\":1.5}}},{\"id\":\"portraits-bride.jpg\",\"file\":\"bride.jpg\",\"v\":1794485583,\"w\":2000,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794485583,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794485583,\"d\":{\"x\":26.5,\"y\":33.1,\"z\":1.6},\"m\":{\"x\":7.6,\"y\":31.3,\"z\":1.5}}}],\"background\":[{\"id\":\"background-right.jpg\",\"file\":\"right.jpg\",\"v\":1794392676,\"w\":1066,\"h\":1600,\"caption\":\"\",\"opt\":{\"v\":1794392676,\"fmt\":\"webp\",\"w\":[480,960,1066]},\"fit\":{\"v\":1794392676,\"d\":{\"x\":50,\"y\":50,\"z\":1.2},\"m\":{\"x\":50,\"y\":50,\"z\":1.2}}},{\"id\":\"background-left.jpg\",\"file\":\"left.jpg\",\"v\":1794393509,\"w\":1067,\"h\":1600,\"caption\":\"\",\"opt\":{\"v\":1794393509,\"fmt\":\"webp\",\"w\":[480,960,1067]},\"fit\":{\"v\":1794393509,\"d\":{\"x\":20.9,\"y\":45.1,\"z\":1.1},\"m\":{\"x\":20.9,\"y\":45.1,\"z\":1.1}}},{\"id\":\"background-timeline-left.jpg\",\"file\":\"timeline-left.jpg\",\"v\":1794485643,\"w\":2000,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794485643,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794485643,\"d\":{\"x\":50,\"y\":41.7,\"z\":1},\"m\":null}},{\"id\":\"background-timeline-right.jpg\",\"file\":\"timeline-right.jpg\",\"v\":1794485725,\"w\":2000,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794485725,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794485725,\"d\":{\"x\":24.6,\"y\":32.5,\"z\":1},\"m\":null}},{\"id\":\"background-moment-2.jpg\",\"file\":\"moment-2.jpg\",\"v\":1794485809,\"w\":2000,\"h\":3000,\"caption\":\"\",\"opt\":{\"v\":1794485809,\"fmt\":\"webp\",\"w\":[480,960,1280,1600]},\"fit\":{\"v\":1794485809,\"d\":{\"x\":28.4,\"y\":51.8,\"z\":1.2},\"m\":{\"x\":26.6,\"y\":41.3,\"z\":1.32}}}]}}",
      "section": "media",
      "label": "Bản kê media (trang tự ghi)"
    }
  ],
  "family_members": [
    {
      "id": 8,
      "side": "bride",
      "role_label": "Mẹ",
      "name_vi": "Nguyễn Thị Kim Phương",
      "name_en": "",
      "sort_order": 2,
      "updated_at": "2026-04-20T12:03:13.45+00:00"
    },
    {
      "id": 7,
      "side": "bride",
      "role_label": "Cha",
      "name_vi": "Nguyễn Văn Đông",
      "name_en": "",
      "sort_order": 1,
      "updated_at": "2026-04-20T12:03:16.817+00:00"
    },
    {
      "id": 2,
      "side": "groom",
      "role_label": "Mẹ",
      "name_vi": "Phạm Hồng Thuý",
      "name_en": "",
      "sort_order": 2,
      "updated_at": "2026-04-20T12:12:47.156+00:00"
    },
    {
      "id": 1,
      "side": "groom",
      "role_label": "Cha",
      "name_vi": "Chu Đăng Trung",
      "name_en": "",
      "sort_order": 1,
      "updated_at": "2026-04-20T12:12:48.373+00:00"
    }
  ],
  "timeline_events": [
    {
      "id": 5,
      "time": "19:00",
      "label_vi": "Khai tiệc",
      "label_en": "Reception",
      "image_path": "",
      "sort_order": 4,
      "updated_at": "2026-11-11T10:03:21.568+00:00"
    },
    {
      "id": 3,
      "time": "18:30",
      "label_vi": "Bắt đầu buổi lễ",
      "label_en": "Ceremony begins",
      "image_path": "",
      "sort_order": 3,
      "updated_at": "2026-11-11T10:03:37.787+00:00"
    },
    {
      "id": 2,
      "time": "18:00",
      "label_vi": "Đón khách",
      "label_en": "Guest welcome",
      "image_path": "",
      "sort_order": 2,
      "updated_at": "2026-11-11T10:03:39.482+00:00"
    },
    {
      "id": 1,
      "time": "17:30",
      "label_vi": "Chụp ảnh gia đình",
      "label_en": "Family photo session",
      "image_path": "",
      "sort_order": 1,
      "updated_at": "2026-11-11T10:03:41.102+00:00"
    }
  ]
};
