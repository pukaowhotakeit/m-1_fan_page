const DATA_FILE = "data/combiList.json";
const RESULTS_PER_PAGE = 20;
const MAX_RESULTS = 70;

let combiList = [];
let searchResults = [];
let currentPage = 1;

// ------------------------------
// Initialization
// ------------------------------

window.addEventListener("DOMContentLoaded", async () => {

    await loadData();

    document
        .getElementById("searchButton")
        .addEventListener("click", startSearch);

    document
        .getElementById("searchInput")
        .addEventListener("keydown", (event) => {

            if (event.key === "Enter") {
                startSearch();
            }

        });

});

// ------------------------------
// Load JSON
// ------------------------------

async function loadData() {

    const messageArea = document.getElementById("messageArea");

    messageArea.textContent = "データを読み込んでいます...";

    try {

        const response = await fetch(DATA_FILE);

        if (!response.ok) {
            throw new Error("Failed to load JSON.");
        }

        combiList = await response.json();

        messageArea.textContent =
            `${combiList.length}件のコンビ情報を読み込みました。`;

    }

    catch (error) {

        console.error(error);

        messageArea.textContent =
            "データの読み込みに失敗しました。";

    }

}

// ------------------------------
// Search
// ------------------------------

function startSearch() {

    const keyword = normalize(
        document.getElementById("searchInput").value
    );

    const messageArea = document.getElementById("messageArea");

    if (keyword === "") {

        messageArea.textContent =
            "検索するメンバー名を入力してください。";

        clearResults();

        return;

    }

    searchResults = [];

    for (const combi of combiList) {

        let matchedMember = null;

        for (const member of combi.members) {

            const name = normalize(member.name);
            const kana = normalize(member.kana);

            if (
                name.includes(keyword) ||
                kana.includes(keyword)
            ) {

                matchedMember = member;
                break;

            }

        }

        if (matchedMember !== null) {

            searchResults.push({

                combiName: combi.combi.name,
                url: combi.url,
                matchedMember: {
                    name: matchedMember.name,
                    kana: matchedMember.kana
                }
            });

            if (searchResults.length >= MAX_RESULTS) {

                messageArea.textContent =
                    "検索結果が多すぎます。検索条件を絞ってください。";

                clearResults();

                return;

            }

        }

    }

    currentPage = 1;

    messageArea.textContent =
        `${searchResults.length}件見つかりました。`;

    renderResults();
    renderPagination();

}

// ------------------------------
// Page Change
// ------------------------------

function changePage(page) {

    currentPage = page;

    renderResults();
    renderPagination();

}

// ------------------------------
// Utility
// ------------------------------

function normalize(text) {

    return text
        .replace(/\s/g, "")
        .replace(/　/g, "")
        .trim();

}

function clearResults() {

    document.getElementById("resultArea").innerHTML = "";
    document.getElementById("paginationArea").innerHTML = "";

}

// ------------------------------
// Render Results
// ------------------------------

function renderResults() {

    const resultArea = document.getElementById("resultArea");

    resultArea.innerHTML = "";

    const start = (currentPage - 1) * RESULTS_PER_PAGE;
    const end = start + RESULTS_PER_PAGE;

    const pageResults = searchResults.slice(start, end);

    for (const result of pageResults) {

        const card = document.createElement("div");
        card.className = "result-card";

        card.innerHTML = `
            <h2>${result.combiName}</h2>

            <p><strong>ヒットしたメンバー</strong></p>

            <p>
                ${result.matchedMember.name}
                （${result.matchedMember.kana}）
            </p>

            <p>
                <a href="${result.url}" target="_blank" rel="noopener noreferrer">
                    ▶ M-1公式ページ
                </a>
            </p>
        `;

        resultArea.appendChild(card);

    }

}

// ------------------------------
// Render Pagination
// ------------------------------

function renderPagination() {

    const paginationArea =
        document.getElementById("paginationArea");

    paginationArea.innerHTML = "";

    const totalPages =
        Math.ceil(searchResults.length / RESULTS_PER_PAGE);

    if (totalPages <= 1) {
        return;
    }

    // Prev

    const prevButton =
        document.createElement("button");

    prevButton.textContent = "＜";

    prevButton.disabled = currentPage === 1;

    prevButton.addEventListener("click", () => {

        if (currentPage > 1) {
            changePage(currentPage - 1);
        }

    });

    paginationArea.appendChild(prevButton);

    // Page Numbers

    for (let page = 1; page <= totalPages; page++) {

        const button =
            document.createElement("button");

        button.textContent = page;

        if (page === currentPage) {
            button.classList.add("active");
        }

        button.addEventListener("click", () => {

            changePage(page);

        });

        paginationArea.appendChild(button);

    }

    // Next

    const nextButton =
        document.createElement("button");

    nextButton.textContent = "＞";

    nextButton.disabled =
        currentPage === totalPages;

    nextButton.addEventListener("click", () => {

        if (currentPage < totalPages) {
            changePage(currentPage + 1);
        }

    });

    paginationArea.appendChild(nextButton);

}