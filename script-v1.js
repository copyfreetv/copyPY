// --- [ CONFIG ] ---
const CATEGORIES = [
    { key: 'new', title: 'หนังใหม่' },
    { key: 'thai', title: 'หนังไทย' },
    { key: 'korea', title: 'หนังเกาหลี' },
    { key: 'china', title: 'หนังจีน/ฮ่องกง' },
    { key: 'inter', title: 'หนังฝรั่ง/สากล' },
    { key: 'cartoon', title: 'การ์ตูน/อนิเมชั่น' },
    { key: 'india', title: 'หนังอินเดีย' },
    { key: 'asia', title: 'หนังเอเซีย' },
    { key: 'laconcin', title: 'ละครจีน' },
    { key: 'new2', title: 'หนัง' }
];

const ITEMS_PER_ROW = 16;
let allMoviesByTitle = {};
let originalSectionsHtml = ''; // เก็บ HTML หน้าหลักเดิม

// --- [ COMMON FUNCTIONS ] ---
function createMovieCard(movie, index = 0) {
  const moviePlayer = movie.player || 'watch';
  const movieName = movie.nameTH || movie.nameEN || movie.name || '';
  const movieSeason = movie.season || '1';
  const movieFile = movie.file || movie.url || movie.video;
  const movieSubtitle = movie.subtitle;

  let watchUrl = `${moviePlayer}.html?file=${encodeURIComponent(movieFile || '')}&season=${encodeURIComponent(movieSeason)}&name=${encodeURIComponent(movieName)}`;
  if (movieSubtitle?.trim()) {
    watchUrl += `&subtitle=${encodeURIComponent(movieSubtitle)}`;
  }

  const soundText = movie.info?.sound || (typeof movie.info === 'string' ? movie.info : '');
  const subtitleText = movie.info?.subtitles || '';
  const posterUrl = movie.logo || movie.image || movie.poster || (typeof movie.info === 'object' ? movie.info.poster : null);

  return `
    <div class="flex-shrink-0 w-[150px] bg-gray-800 rounded-xl overflow-hidden shadow-lg 
                hover:shadow-blue-500/30 transition duration-300 group cursor-pointer 
                transform hover:scale-105 opacity-0 animate-fadeIn"
         style="animation-delay:${index * 0.3}s">
      <a href="${watchUrl}">
        <div class="relative">
          <img src="${posterUrl || '/images/no-image.jpg.svg'}"
               onerror="this.onerror=null;this.src='/images/no-image.jpg.svg';"
               alt="${movieName}"
               class="w-full h-[225px] object-cover transition duration-500 group-hover:opacity-90">
          <div class="absolute top-1 right-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs px-2 py-1 rounded-md font-medium shadow-md border border-blue-400/30">
            ${soundText}
          </div>
        </div>
        <div class="p-2">
          <p class="text-sm font-semibold truncate" title="${movieName}">${movieName}</p>
          <p class="text-xs text-gray-400">เสียงภาษา : ${soundText}</p>
          <p class="text-xs text-gray-400">ซับไตเติล : ${subtitleText || 'ไม่มี'}</p>
        </div>
      </a>
    </div>
  `;
}

// --- [ INDEX.HTML LOGIC ] ---
function createMovieSection(title, movies, categoryKey, isSearch = false) {
  const limit = isSearch ? movies.length : ITEMS_PER_ROW;
  const limitedMovies = movies.slice(0, limit);
  const cardsHtml = limitedMovies.map((movie, i) => createMovieCard(movie, i)).join('');
  const categoryUrl = `category.html?cat=${categoryKey}`;

  if (isSearch) {
    return `
      <section class="mb-10">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-bold border-l-4 border-red-600 pl-3">
            ${title}
          </h3>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          ${cardsHtml}
        </div>
      </section>
    `;
  }

  return `
    <section class="mb-10 relative">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-3xl font-bold border-l-4 border-red-600 pl-3">
          ${title}
        </h3>
        <a href="${categoryUrl}" 
           class="text-red-600 font-semibold hover:text-red-400 transition">
          ดูทั้งหมด ›
        </a>
      </div>

      <!-- ปุ่มเลื่อนซ้าย -->
      <button 
        class="absolute left-0 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 z-10"
        onclick="scrollSection(this, -1)">‹</button>

      <!-- Container แนวนอน -->
      <div class="movie-row flex space-x-2 overflow-x-auto scrollbar-hide pb-4 px-4 snap-x snap-mandatory scroll-smooth">
        ${cardsHtml}
      </div>

      <!-- ปุ่มเลื่อนขวา -->
      <button 
        class="absolute right-0 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 z-10"
        onclick="scrollSection(this, 1)">›</button>
    </section>
  `;
}

async function loadAllMovies() {
    const container = document.getElementById('movie-sections-container');
    const searchResultContainer = document.getElementById('search-result-container');

    searchResultContainer.innerHTML = '';
    searchResultContainer.style.display = 'none';
    container.style.display = 'block';

    container.innerHTML = '<p class="text-gray-400">กำลังโหลดรายการหนังทั้งหมด...</p>';
    let allSectionsHtml = '';
    allMoviesByTitle = {};

    for (const category of CATEGORIES) {
        let movies = [];
        try {
            const response = await fetch(`./playlist/${category.key}.json`);
            if (!response.ok) {
                console.warn(`Skipping category ${category.key}: File not found or failed to load.`);
                continue;
            }
            movies = await response.json();
        } catch (error) {
            console.error(`Error loading JSON for ${category.key}:`, error);
            continue;
        }

        if (movies && movies.length > 0) {
            allSectionsHtml += createMovieSection(category.title, movies, category.key);

            movies.forEach(movie => {
                const nameKey = (movie.name || '').toLowerCase();
                if (!allMoviesByTitle[nameKey]) {
                    allMoviesByTitle[nameKey] = movie;
                }
            });
        }
    }

    if (allSectionsHtml) {
        container.innerHTML = allSectionsHtml;
        originalSectionsHtml = allSectionsHtml;
    } else {
        container.innerHTML = '<p class="text-blue-500">ไม่พบรายการหนังในทุกหมวดหมู่. โปรดตรวจสอบไฟล์ JSON ในโฟลเดอร์ playlist/</p>';
        originalSectionsHtml = '';
    }
}

// --- [ SEARCH LOGIC ] ---
function searchMovies() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const container = document.getElementById('movie-sections-container');
    const searchResultContainer = document.getElementById('search-result-container');

    if (!query || query.length < 2) {
        searchResultContainer.innerHTML = '';
        searchResultContainer.style.display = 'none';
        container.style.display = 'block';
        if (originalSectionsHtml) {
            container.innerHTML = originalSectionsHtml;
        } else {
            loadAllMovies();
        }
        return;
    }

    container.style.display = 'none';
    searchResultContainer.style.display = 'block';

    const allMoviesArray = Object.values(allMoviesByTitle);

    const filteredMovies = allMoviesArray.filter(movie => {
        const name = (movie.name || '').toLowerCase();
        const description = movie.info?.description?.toLowerCase() || '';
        const sound = movie.info?.sound?.toLowerCase() || '';
        const subtitles = movie.info?.subtitles?.toLowerCase() || '';

        const searchText = `${name} ${description} ${sound} ${subtitles}`;
        return searchText.includes(query);
    });

    if (filteredMovies.length > 0) {
        const searchTitle = `🔍 ผลการค้นหา "${document.getElementById('search-input').value}" (${filteredMovies.length} รายการ)`;
        const searchSection = createMovieSection(searchTitle, filteredMovies, 'search', true);
        searchResultContainer.innerHTML = searchSection;
    } else {
        searchResultContainer.innerHTML = `<p class="text-blue-500 text-2xl mt-8">ไม่พบรายการหนังที่ตรงกับ "${document.getElementById('search-input').value}"</p>`;
    }
}

// --- [ INIT ] ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.title.includes('หน้าหลัก')) {
        loadAllMovies();
    }
});