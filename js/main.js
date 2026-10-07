/* ============================================================
   SLEPOK.KZ — ЛОГИКА САЙТА
   Рендерит весь контент из content/site.json. Тексты, цены и фото
   меняются через админку: адрес сайта + /admin/
   ============================================================ */
function slepokStart(){
  "use strict";
  var DATA = window.SLEPOK_DATA;

  /* ---------- Утилиты ---------- */
  function escapeHtml(str){
    return String(str == null ? "" : str).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
    });
  }
  function formatPrice(n){
    return Number(n).toLocaleString("ru-RU") + " ₸";
  }
  function $(sel, ctx){ return (ctx||document).querySelector(sel); }
  function $all(sel, ctx){ return Array.prototype.slice.call((ctx||document).querySelectorAll(sel)); }

  var SHORT_LABELS = {
    materials: "Материалы",
    molding: "Снятие формы",
    volumeModel: "Объёмная модель",
    handProcessing: "Ручная обработка",
    finishProcessing: "Финиш. обработка",
    design: "Оформление",
    compositionPrep: "Композиция",
    packaging: "Упаковка"
  };

  var ICON_PATHS = {
    materials: '<rect x="4" y="8" width="16" height="12" rx="1"/><path d="M4 8l8-4 8 4"/><path d="M12 4v16"/>',
    molding: '<rect x="5" y="5" width="10" height="10" rx="1"/><rect x="9" y="9" width="10" height="10" rx="1"/>',
    volume: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12v9M4 7.5l8 4.5 8-4.5"/>',
    hand: '<path d="M4 20l4-1 10-10-3-3L5 16l-1 4z"/><path d="M14 6l3 3"/>',
    finish: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/>',
    design: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 4v16M4 8h16"/>',
    composition: '<path d="M12 4l8 4-8 4-8-4 8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 16l8 4 8-4"/>',
    packaging: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M4 9l8-5 8 5"/><path d="M12 4v16"/>',
    heart: '<path d="M12 21s-7.5-4.8-9.5-9.3C1 8.5 2.9 5 6.4 5c2 0 3.4 1.1 4.1 2.4.7-1.3 2.1-2.4 4.1-2.4 3.5 0 5.4 3.5 3.9 6.7C19.5 16.2 12 21 12 21z"/>'
  };

  /* ---------- WhatsApp ---------- */
  function waLink(message){
    var num = (DATA.contacts.whatsapp || "").replace(/\D/g,"");
    if(!num) return null;
    return "https://wa.me/" + num + "?text=" + encodeURIComponent(message);
  }
  function initWaButtons(root){
    $all("[data-wa-order]", root).forEach(function(el){
      var link = waLink(el.getAttribute("data-wa-order"));
      if(link){
        el.setAttribute("href", link);
        el.setAttribute("target","_blank");
        el.setAttribute("rel","noopener");
      } else {
        el.setAttribute("href","#");
        el.addEventListener("click", function(e){
          e.preventDefault();
          alert("Укажите номер WhatsApp в админке, раздел «Контакты», чтобы кнопка заработала.");
        });
      }
    });
  }

  /* ---------- Медиа-плейсхолдер ---------- */
  function mediaBlock(imagePath, label){
    var initial = (label || "?").trim().charAt(0).toUpperCase();
    if(imagePath){
      return '<div class="media-placeholder"><img src="' + escapeHtml(imagePath) + '" alt="' + escapeHtml(label||"") + '" style="width:100%;height:100%;object-fit:cover;"></div>';
    }
    return '<div class="media-placeholder"><span class="media-placeholder__initial">' + escapeHtml(initial) + '</span><span class="media-placeholder__badge">Добавьте фото</span></div>';
  }

  /* ---------- Hero ---------- */
  function renderHero(){
    $("#heroTitle").textContent = DATA.hero.title;
    $("#heroSubtitle").textContent = DATA.hero.subtitle;
    var img = $("#heroImage");
    if(DATA.hero.image){
      img.innerHTML = '<img src="' + escapeHtml(DATA.hero.image) + '" alt="Готовый слепок" style="width:100%;height:100%;object-fit:cover;">';
    } else {
      img.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="' + "" + '" style="stroke:#5A4632" stroke-width="1.2">' + ICON_PATHS.heart + '</svg>';
    }
    var trust = $("#trustBar");
    trust.innerHTML = DATA.hero.trust.map(function(t){
      return '<li><span class="dot"></span>' + escapeHtml(t.text) + '</li>';
    }).join("");
  }

  /* ---------- Что входит: общий грид ---------- */
  function renderIncluded(){
    var grid = $("#includedGrid");
    grid.innerHTML = DATA.masterIncludes.map(function(inc){
      return '<div class="included-item">' +
        '<div class="included-item__icon"><svg viewBox="0 0 24 24" stroke-width="1.3">' + (ICON_PATHS[inc.icon]||"") + '</svg></div>' +
        '<div class="included-item__label">' + escapeHtml(inc.label) + '</div>' +
        '</div>';
    }).join("");
  }

  /* ---------- Каталог ---------- */
  var allItems = [];
  DATA.categories.forEach(function(cat){
    cat.items.forEach(function(item){
      allItems.push({ item: item, categoryId: cat.id, categoryTitle: cat.title });
    });
  });
  var activeCategory = "all";

  function includesChips(includes){
    if(!includes || !includes.length){
      return '<span class="chip chip--muted">Комплектация уточняется</span>';
    }
    return includes.slice(0,3).map(function(key){
      return '<span class="chip">' + escapeHtml(SHORT_LABELS[key] || key) + '</span>';
    }).join("") + (includes.length > 3 ? '<span class="chip">+' + (includes.length-3) + '</span>' : "");
  }

  function metaChips(item){
    var chips = [];
    if(item.countNote) chips.push('<span class="chip">' + escapeHtml(item.countNote) + '</span>');
    if(item.sizeNote) chips.push('<span class="chip">' + escapeHtml(item.sizeNote) + '</span>');
    if(!chips.length) return "";
    return '<div class="product-card__meta">' + chips.join("") + '</div>';
  }

  function productCardHtml(entry){
    var item = entry.item;
    var priceHtml = (typeof item.price === "number")
      ? '<div class="product-card__price">' + formatPrice(item.price) + '<small>цена за комплект</small></div>'
      : '<div class="product-card__price is-tbd">Цена уточняется</div>';
    var waMsg = "Здравствуйте! Интересует «" + item.name + "» из каталога Slepok.kz.";
    return '<article class="product-card" data-category="' + entry.categoryId + '">' +
      mediaBlock(item.image, item.name) +
      '<div class="product-card__body">' +
        '<span class="product-card__category">' + escapeHtml(entry.categoryTitle) + '</span>' +
        '<h3 class="product-card__name">' + escapeHtml(item.name) + '</h3>' +
        metaChips(item) +
        '<p class="product-card__desc">' + escapeHtml(item.description || "") + '</p>' +
        '<div class="product-card__includes">' + includesChips(item.includes) + '</div>' +
        priceHtml +
        '<div class="product-card__actions">' +
          '<button class="btn btn--outline" data-action="open-product" data-id="' + item.id + '">Выбрать</button>' +
          '<a href="#" class="btn btn--whatsapp" data-wa-order="' + escapeHtml(waMsg) + '">В WhatsApp</a>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function renderCatalogTabs(){
    var tabs = $("#catalogTabs");
    var html = '<button class="catalog-tab is-active" data-cat="all">Все</button>';
    html += DATA.categories.map(function(cat){
      return '<button class="catalog-tab" data-cat="' + cat.id + '">' + escapeHtml(cat.title) + '</button>';
    }).join("");
    tabs.innerHTML = html;
    tabs.addEventListener("click", function(e){
      var btn = e.target.closest(".catalog-tab");
      if(!btn) return;
      activeCategory = btn.getAttribute("data-cat");
      $all(".catalog-tab", tabs).forEach(function(b){ b.classList.toggle("is-active", b===btn); });
      renderCatalogGrid();
    });
  }

  function renderCatalogGrid(){
    var grid = $("#catalogGrid");
    var list = activeCategory === "all" ? allItems : allItems.filter(function(e){ return e.categoryId === activeCategory; });
    grid.innerHTML = list.map(productCardHtml).join("");
    initWaButtons(grid);
  }

  /* ---------- Модалка товара ---------- */
  function openProductModal(id){
    var entry = allItems.filter(function(e){ return e.item.id === id; })[0];
    if(!entry) return;
    var item = entry.item;
    var hasIncludes = item.includes && item.includes.length > 0;
    var includesRows = hasIncludes
      ? DATA.masterIncludes.map(function(inc){
          var on = item.includes.indexOf(inc.key) !== -1;
          return '<div class="row ' + (on?"on":"off") + '">' + (on?"✓":"–") + '&nbsp; ' + escapeHtml(inc.label) + '</div>';
        }).join("")
      : '<p style="color:var(--text-muted);font-size:13.5px;margin:0;">Точная комплектация уточняется у мастера — напишите в WhatsApp, ответим быстро.</p>';
    var priceHtml = (typeof item.price === "number")
      ? formatPrice(item.price)
      : "Цена уточняется";
    var meta = [];
    if(item.countNote) meta.push('<span class="chip">' + escapeHtml(item.countNote) + '</span>');
    if(item.sizeNote) meta.push('<span class="chip">Размер: ' + escapeHtml(item.sizeNote) + '</span>');
    if(item.termNote) meta.push('<span class="chip">Срок: ' + escapeHtml(item.termNote) + '</span>');
    var waMsg = "Здравствуйте! Интересует «" + item.name + "» из каталога Slepok.kz.";
    $("#modalBody").innerHTML =
      mediaBlock(item.image, item.name) +
      '<div style="height:20px"></div>' +
      '<span class="product-card__category">' + escapeHtml(entry.categoryTitle) + '</span>' +
      '<h3>' + escapeHtml(item.name) + '</h3>' +
      (item.description ? '<p>' + escapeHtml(item.description) + '</p>' : '') +
      '<div class="modal__meta">' + meta.join("") + '</div>' +
      '<div class="modal__price">' + priceHtml + '</div>' +
      '<div class="modal__includes">' + includesRows + '</div>' +
      '<div class="modal__actions">' +
        '<a href="#" class="btn btn--whatsapp btn--block" data-wa-order="' + escapeHtml(waMsg) + '">Заказать в WhatsApp</a>' +
      '</div>';
    initWaButtons($("#modalBody"));
    openModal();
  }

  /* ---------- Модалка "комплектация по вариантам" ---------- */
  function openComplectationModal(){
    var anyFilled = allItems.some(function(e){ return e.item.includes && e.item.includes.length; });
    if(!anyFilled){
      $("#modalBody").innerHTML =
        '<h3>Комплектация по вариантам</h3>' +
        '<p style="color:var(--text-muted);">Для товаров каталога пока не расписано, какие именно пункты чек-листа входят в цену — это уточняется индивидуально. ' +
        'Заполнить можно в админке, в поле «Что входит» у каждого товара, и здесь появится таблица сравнения.</p>' +
        '<div class="modal__actions"><a href="#" class="btn btn--whatsapp btn--block" data-wa-order="Здравствуйте! Хочу уточнить, что входит в стоимость.">Спросить в WhatsApp</a></div>';
      initWaButtons($("#modalBody"));
      openModal();
      return;
    }
    var head = '<th>Вариант</th>' + DATA.masterIncludes.map(function(inc){
      return '<th title="' + escapeHtml(inc.label) + '">' + escapeHtml(SHORT_LABELS[inc.key]) + '</th>';
    }).join("");
    var rows = allItems.map(function(entry){
      var item = entry.item;
      var cells = DATA.masterIncludes.map(function(inc){
        var on = item.includes && item.includes.indexOf(inc.key) !== -1;
        return '<td class="' + (on?"yes":"no") + '">' + (on?"✓":"–") + '</td>';
      }).join("");
      return '<tr><td>' + escapeHtml(item.name) + '</td>' + cells + '</tr>';
    }).join("");
    $("#modalBody").innerHTML =
      '<h3>Комплектация по вариантам</h3>' +
      '<p>Отметки показывают, что именно входит в стоимость каждого варианта. Точные цены — в каталоге.</p>' +
      '<div class="table-scroll"><table class="complectation-table"><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    openModal();
  }

  /* ---------- Пакеты ---------- */
  function renderPackages(){
    var section = $("#packages");
    if(!DATA.showPackages){
      section.style.display = "none";
      return;
    }
    var grid = $("#packagesGrid");
    grid.innerHTML = DATA.packages.map(function(p){
      var rows = [
        ["Количество слепков", p.itemsCount],
        ["Размер", p.size],
        ["Оформление", p.design],
        ["Рамка", p.frame],
        ["Доп. элементы", p.extras],
        ["Срок изготовления", p.productionTime]
      ].filter(function(r){ return r[1]; })
       .map(function(r){ return '<div class="package-card__row"><span>' + r[0] + '</span><span>' + escapeHtml(r[1]) + '</span></div>'; })
       .join("");
      var priceHtml = (typeof p.price === "number")
        ? '<div class="package-card__price">' + formatPrice(p.price) + '</div>'
        : '<div class="package-card__price is-tbd">Цена уточняется</div>';
      var waMsg = "Здравствуйте! Интересует комплект «" + p.name + "».";
      return '<div class="package-card' + (p.highlight?" is-highlight":"") + '">' +
        (p.highlight ? '<span class="package-card__badge">Самый выгодный</span>' : '') +
        '<h3 class="package-card__name">' + escapeHtml(p.name) + '</h3>' +
        priceHtml +
        '<div class="package-card__list">' + (rows || '<p style="color:var(--text-muted);font-size:13.5px;">Состав комплекта уточняется</p>') + '</div>' +
        '<a href="#" class="btn btn--primary btn--block" data-wa-order="' + escapeHtml(waMsg) + '">Выбрать</a>' +
      '</div>';
    }).join("");
    initWaButtons(grid);
  }

  /* ---------- Доп. услуги ---------- */
  function renderAddons(){
    var grid = $("#addonsGrid");
    grid.innerHTML = DATA.additionalServices.map(function(a){
      var priceHtml = (typeof a.price === "number")
        ? '<span class="addon-row__price">' + formatPrice(a.price) + '</span>'
        : '<span class="addon-row__price is-tbd">уточняется</span>';
      return '<div class="addon-row"><span class="addon-row__name">' + escapeHtml(a.name) + '</span>' + priceHtml + '</div>';
    }).join("");
  }

  /* ---------- Шаги ---------- */
  function renderSteps(){
    var grid = $("#stepsGrid");
    grid.innerHTML = DATA.steps.map(function(s){
      return '<div class="step-card"><div class="step-card__num">' + s.number + '</div>' +
        '<h3 class="step-card__title">' + escapeHtml(s.title) + '</h3>' +
        '<p class="step-card__text">' + escapeHtml(s.text) + '</p></div>';
    }).join("");
  }

  /* ---------- Почему мы ---------- */
  function renderWhyUs(){
    var grid = $("#whyusGrid");
    grid.innerHTML = DATA.whyUs.map(function(w){
      return '<div class="whyus-card"><h3 class="whyus-card__title">' + escapeHtml(w.title) + '</h3>' +
        '<p class="whyus-card__text">' + escapeHtml(w.text || "") + '</p></div>';
    }).join("");
  }

  /* ---------- Галерея ---------- */
  function renderGallery(){
    var grid = $("#galleryGrid");
    grid.innerHTML = DATA.gallery.map(function(g, i){
      return '<button class="gallery-item" data-index="' + i + '">' +
        mediaBlock(g.image, g.category) +
        '<span class="gallery-item__label">' + escapeHtml(g.category) + '</span>' +
      '</button>';
    }).join("");
    grid.addEventListener("click", function(e){
      var btn = e.target.closest(".gallery-item");
      if(!btn) return;
      var g = DATA.gallery[Number(btn.getAttribute("data-index"))];
      $("#lightboxContent").innerHTML = mediaBlock(g.image, g.category);
      $("#lightbox").classList.add("is-open");
    });
  }

  /* ---------- FAQ ---------- */
  function renderFaq(){
    var list = $("#faqList");
    list.innerHTML = DATA.faq.map(function(f, i){
      var answer = f.answer ? escapeHtml(f.answer) : 'Ответ уточняется — напишите нам в WhatsApp, ответим быстро.';
      return '<div class="faq-item" data-index="' + i + '">' +
        '<button class="faq-item__q"><span>' + escapeHtml(f.question) + '</span><span class="plus">+</span></button>' +
        '<div class="faq-item__a"><p class="faq-item__a-inline">' + answer + '</p></div>' +
      '</div>';
    }).join("");
    list.addEventListener("click", function(e){
      var q = e.target.closest(".faq-item__q");
      if(!q) return;
      var item = q.closest(".faq-item");
      var body = item.querySelector(".faq-item__a");
      var willOpen = !item.classList.contains("is-open");
      $all(".faq-item", list).forEach(function(fi){
        fi.classList.remove("is-open");
        fi.querySelector(".faq-item__a").style.maxHeight = null;
      });
      if(willOpen){
        item.classList.add("is-open");
        body.style.maxHeight = body.scrollHeight + "px";
      }
    });
  }

  /* ---------- Финальный CTA ---------- */
  function renderFinalCta(){
    $("#finalCtaTitle").textContent = DATA.finalCta.title;
    $("#finalCtaText").textContent = DATA.finalCta.text;
  }

  /* ---------- Футер ---------- */
  function renderFooter(){
    var c = DATA.contacts;
    var lines = [];
    if(c.phoneDisplay) lines.push(escapeHtml(c.phoneDisplay));
    if(c.city) lines.push(escapeHtml(c.city));
    if(c.address) lines.push(escapeHtml(c.address));
    if(c.instagram) lines.push('<a href="' + escapeHtml(c.instagram) + '" target="_blank" rel="noopener">Instagram</a>');
    $("#footerContacts").innerHTML = lines.map(function(l){ return '<span>' + l + '</span>'; }).join("");
    $("#footerYear").textContent = new Date().getFullYear();
  }

  /* ---------- Модалка: открытие/закрытие ---------- */
  function openModal(){ $("#modalOverlay").classList.add("is-open"); document.body.style.overflow = "hidden"; }
  function closeModal(){ $("#modalOverlay").classList.remove("is-open"); document.body.style.overflow = ""; }

  /* ---------- Инициализация ---------- */
  function init(){
    renderHero();
    renderIncluded();
    renderCatalogTabs();
    renderCatalogGrid();
    renderPackages();
    renderAddons();
    renderSteps();
    renderWhyUs();
    renderGallery();
    renderFaq();
    renderFinalCta();
    renderFooter();
    initWaButtons(document);

    // Мобильное меню
    var burger = $("#burger"), mobileMenu = $("#mobileMenu");
    burger.addEventListener("click", function(){
      var open = mobileMenu.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $all(".mobile-menu__link").forEach(function(a){
      a.addEventListener("click", function(){
        mobileMenu.classList.remove("is-open");
        burger.setAttribute("aria-expanded","false");
      });
    });

    // Клик по карточке товара
    document.addEventListener("click", function(e){
      var openBtn = e.target.closest('[data-action="open-product"]');
      if(openBtn){ openProductModal(openBtn.getAttribute("data-id")); }
    });

    $("#btnShowComplectation").addEventListener("click", openComplectationModal);
    $("#modalClose").addEventListener("click", closeModal);
    $("#modalOverlay").addEventListener("click", function(e){ if(e.target === this) closeModal(); });
    document.addEventListener("keydown", function(e){ if(e.key === "Escape"){ closeModal(); closeLightbox(); } });

    function closeLightbox(){ $("#lightbox").classList.remove("is-open"); }
    $("#lightboxClose").addEventListener("click", closeLightbox);
    $("#lightbox").addEventListener("click", function(e){ if(e.target === this) closeLightbox(); });
  }

  if(document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", init); } else { init(); }
}

/* ---------- Загрузка данных из content/site.json ----------
   Данные сайта редактируются в админке (адрес сайта + /admin/).
   Здесь они приводятся к единому виду, чтобы пустые поля
   из админки не ломали страницу. */
(function(){
  "use strict";
  var LISTS = ["masterIncludes","categories","packages","additionalServices","steps","whyUs","gallery","faq"];
  function fixImage(v){ return (typeof v === "string") ? v.replace(/^\/+/, "") : ""; }
  function fixPrice(v){
    if(typeof v === "number" && !isNaN(v)) return v;
    if(typeof v === "string" && v.trim() !== "" && !isNaN(Number(v.replace(/\s/g,"")))) return Number(v.replace(/\s/g,""));
    return null;
  }
  function normalize(d){
    d = d || {};
    LISTS.forEach(function(k){ if(!Array.isArray(d[k])) d[k] = []; });
    d.contacts = d.contacts || {};
    d.hero = d.hero || {};
    d.hero.image = fixImage(d.hero.image);
    if(!Array.isArray(d.hero.trust)) d.hero.trust = [];
    d.finalCta = d.finalCta || {};
    d.showPackages = !!d.showPackages;
    d.categories.forEach(function(cat){
      if(!Array.isArray(cat.items)) cat.items = [];
      cat.items.forEach(function(it){
        it.image = fixImage(it.image);
        it.price = fixPrice(it.price);
        if(!Array.isArray(it.includes)) it.includes = [];
      });
    });
    d.packages.forEach(function(p){ p.price = fixPrice(p.price); });
    d.additionalServices.forEach(function(a){ a.price = fixPrice(a.price); });
    d.gallery.forEach(function(g){ g.image = fixImage(g.image); });
    return d;
  }
  fetch("content/site.json", { cache: "no-cache" })
    .then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(d){ window.SLEPOK_DATA = normalize(d); slepokStart(); })
    .catch(function(e){ console.error("Не удалось загрузить content/site.json", e); });
})();
