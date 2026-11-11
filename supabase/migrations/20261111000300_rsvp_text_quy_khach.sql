-- Desktop redesign (11/2026): formal address "Quý khách" in the RSVP heading and lede.
-- RSVP.jsx highlights the phrase "Quý khách!" in the heading.
update public.site_config set value = 'Trân trọng cảm ơn Quý khách!' where key = 'rsvp_heading';
update public.site_config set value = 'Sự hiện diện của Quý khách và gia đình là niềm vinh hạnh lớn cho chúng em trong ngày trọng đại này. Để công tác chuẩn bị được chu đáo, kính mong Quý khách vui lòng xác nhận sự tham dự trước ngày 1.1.2027.' where key = 'rsvp_paragraph';
select key, value from public.site_config where key in ('rsvp_heading','rsvp_paragraph');
