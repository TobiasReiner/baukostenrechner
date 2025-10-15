// Baukostenrechner App
let categories = [];
let chart; // Chart.js instance

// Re-calculate and update UI: totals, benchmark, chart
function computeAndRender() {
    // Compute totals per category and overall
    const vatRate = parseFloat(document.getElementById('vatRate').value) || 0;
    const reserveRate = parseFloat(document.getElementById('reserveRate').value) || 0;
    const currency = document.getElementById('currency').value || '';

    let totalNet = 0;
    const categorySums = categories.map(cat => {
        let sum = 0;
        cat.positions.forEach(pos => {
            const qty = parseFloat(pos.quantity) || 0;
            const price = parseFloat(pos.unitPrice) || 0;
            sum += qty * price;
        });
        totalNet += sum;
        return sum;
    });

    const vatAmount = totalNet * (vatRate / 100);
    const reserveAmount = totalNet * (reserveRate / 100);
    const totalGross = totalNet + vatAmount + reserveAmount;

    // Update totals display
    const totalsDiv = document.getElementById('totals');
    let totalsHtml = '<h2 class="text-xl font-semibold mb-2">Gesamtsummen</h2>';
    totalsHtml += '<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">';
    categories.forEach((cat, idx) => {
        const percent = totalNet > 0 ? ((categorySums[idx] / totalNet) * 100) : 0;
        totalsHtml += `<div><strong>${cat.name || 'Kategorie ' + (idx+1)}</strong>: ${categorySums[idx].toFixed(2)} ${currency} (${percent.toFixed(1)}%)</div>`;
    });
    totalsHtml += '</div>';
    totalsHtml += `<div class="mt-2"><strong>Netto:</strong> ${totalNet.toFixed(2)} ${currency}</div>`;
    totalsHtml += `<div><strong>Mehrwertsteuer (${vatRate}%):</strong> ${vatAmount.toFixed(2)} ${currency}</div>`;
    totalsHtml += `<div><strong>Reserve (${reserveRate}%):</strong> ${reserveAmount.toFixed(2)} ${currency}</div>`;
    totalsHtml += `<div class="text-lg mt-1"><strong>Gesamt:</strong> ${totalGross.toFixed(2)} ${currency}</div>`;
    totalsDiv.innerHTML = totalsHtml;

    // Benchmark percentages (example default: can be adjusted)
    const defaultBench = [40, 10, 6, 15, 20, 5, 4];
    const usedBench = [];
    const usedNames = [];
    const projectPercentages = [];
    // Fill usedBench matching categories length
    let benchSum = defaultBench.reduce((a, b) => a + b, 0);
    for (let i = 0; i < categories.length; i++) {
        let b;
        if (defaultBench[i] !== undefined) {
            b = defaultBench[i];
        } else {
            // distribute remaining equally
            b = (100 - benchSum) / (categories.length - defaultBench.length);
        }
        usedBench.push(b);
        const percent = totalNet > 0 ? (categorySums[i] / totalNet * 100) : 0;
        projectPercentages.push(percent);
        usedNames.push(categories[i].name || 'Kategorie ' + (i+1));
    }
    // Render benchmark table
    const benchmarkDiv = document.getElementById('benchmark');
    let benchHtml = '<h2 class="text-xl font-semibold mb-2">Benchmark-Vergleich (Projekt vs. Durchschnitt)</h2>';
    benchHtml += '<table class="w-full text-sm"><thead><tr><th class="text-left p-1 border-b">Kategorie</th><th class="text-left p-1 border-b">Projekt (%)</th><th class="text-left p-1 border-b">Durchschnitt (%)</th></tr></thead><tbody>';
    usedNames.forEach((name, idx) => {
        benchHtml += `<tr><td class="p-1 border-b">${name}</td><td class="p-1 border-b">${projectPercentages[idx].toFixed(1)}</td><td class="p-1 border-b">${usedBench[idx].toFixed(1)}</td></tr>`;
    });
    benchHtml += '</tbody></table>';
    benchmarkDiv.innerHTML = benchHtml;

    // Update the chart
    updateChart(categorySums, usedNames, totalNet, usedBench);

    // Persist current state
    persistCurrent();
}

// Update Chart.js chart
function updateChart(categorySums, labels, totalNet, benchmarkPercentages) {
    const ctx = document.getElementById('costChart').getContext('2d');
    if (chart) chart.destroy();
    // Generate dynamic colors
    const colors1 = labels.map((_, i) => `hsl(${i * 360 / labels.length}, 60%, 60%)`);
    const colors2 = labels.map((_, i) => `hsl(${(i * 360 / labels.length) + 180}, 60%, 40%)`);
    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Projekt',
                    data: categorySums,
                    backgroundColor: colors1
                },
                {
                    label: 'Benchmark',
                    data: benchmarkPercentages.map(p => totalNet * p / 100),
                    backgroundColor: colors2
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const datasetLabel = context.dataset.label || '';
                            const value = context.parsed;
                            return `${datasetLabel}: ${value.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });
}

// Render categories and positions
function renderCategories() {
    const container = document.getElementById('categories');
    container.innerHTML = '';
    categories.forEach((cat, catIndex) => {
        const catCard = document.createElement('div');
        catCard.className = 'p-4 bg-white rounded shadow';

        // Header with category name and delete button
        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex justify-between items-center mb-2';
        const nameInput = document.createElement('input');
        nameInput.className = 'text-lg font-semibold border-b pb-1 flex-1 mr-2';
        nameInput.value = cat.name;
        nameInput.addEventListener('input', e => {
            categories[catIndex].name = e.target.value;
            computeAndRender();
        });
        const deleteCatBtn = document.createElement('button');
        deleteCatBtn.className = 'text-sm text-red-500';
        deleteCatBtn.textContent = 'Löschen';
        deleteCatBtn.addEventListener('click', () => {
            if (confirm('Kategorie löschen?')) {
                categories.splice(catIndex, 1);
                renderCategories();
                computeAndRender();
            }
        });
        headerDiv.appendChild(nameInput);
        headerDiv.appendChild(deleteCatBtn);
        catCard.appendChild(headerDiv);

        // Table for positions
        const table = document.createElement('table');
        table.className = 'w-full text-sm';
        const thead = document.createElement('thead');
        thead.innerHTML = '<tr><th class="text-left p-1 border-b">Beschreibung</th><th class="text-left p-1 border-b">Einheit</th><th class="text-right p-1 border-b">Menge</th><th class="text-right p-1 border-b">EP</th><th class="text-right p-1 border-b">Summe</th><th></th></tr>';
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        cat.positions.forEach((pos, posIndex) => {
            const row = document.createElement('tr');
            // Description cell
            const descTd = document.createElement('td');
            const descInput = document.createElement('input');
            descInput.className = 'border p-1 w-full';
            descInput.value = pos.description;
            descInput.addEventListener('input', e => {
                categories[catIndex].positions[posIndex].description = e.target.value;
            });
            descTd.appendChild(descInput);
            // Unit cell
            const unitTd = document.createElement('td');
            const unitInput = document.createElement('input');
            unitInput.className = 'border p-1 w-full';
            unitInput.value = pos.unit;
            unitInput.addEventListener('input', e => {
                categories[catIndex].positions[posIndex].unit = e.target.value;
            });
            unitTd.appendChild(unitInput);
            // Quantity cell
            const qtyTd = document.createElement('td');
            const qtyInput = document.createElement('input');
            qtyInput.type = 'number';
            qtyInput.className = 'border p-1 w-full text-right';
            qtyInput.value = pos.quantity;
            qtyInput.addEventListener('input', e => {
                categories[catIndex].positions[posIndex].quantity = parseFloat(e.target.value) || 0;
                computeAndRender();
            });
            qtyTd.appendChild(qtyInput);
            // Unit price cell
            const priceTd = document.createElement('td');
            const priceInput = document.createElement('input');
            priceInput.type = 'number';
            priceInput.className = 'border p-1 w-full text-right';
            priceInput.value = pos.unitPrice;
            priceInput.addEventListener('input', e => {
                categories[catIndex].positions[posIndex].unitPrice = parseFloat(e.target.value) || 0;
                computeAndRender();
            });
            priceTd.appendChild(priceInput);
            // Sum cell
            const sumTd = document.createElement('td');
            sumTd.className = 'text-right p-1 align-middle';
            sumTd.textContent = (pos.quantity * pos.unitPrice).toFixed(2);
            // Delete button cell
            const delTd = document.createElement('td');
            const delBtn = document.createElement('button');
            delBtn.className = 'text-red-500 text-xs';
            delBtn.textContent = '✕';
            delBtn.addEventListener('click', () => {
                categories[catIndex].positions.splice(posIndex, 1);
                renderCategories();
                computeAndRender();
            });
            delTd.appendChild(delBtn);
            // Append cells to row
            row.appendChild(descTd);
            row.appendChild(unitTd);
            row.appendChild(qtyTd);
            row.appendChild(priceTd);
            row.appendChild(sumTd);
            row.appendChild(delTd);
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        catCard.appendChild(table);
        // Add position button
        const addPosBtn = document.createElement('button');
        addPosBtn.className = 'mt-2 bg-gray-200 hover:bg-gray-300 px-2 py-1 text-sm rounded';
        addPosBtn.textContent = 'Position hinzufügen';
        addPosBtn.addEventListener('click', () => {
            categories[catIndex].positions.push({ description: '', unit: 'm²', quantity: 0, unitPrice: 0 });
            renderCategories();
            computeAndRender();
        });
        catCard.appendChild(addPosBtn);
        container.appendChild(catCard);
    });
}

// Persist current project state to localStorage (for auto-saving edits)
function persistCurrent() {
    const name = document.getElementById('projectName').value;
    const vatRate = parseFloat(document.getElementById('vatRate').value) || 0;
    const reserveRate = parseFloat(document.getElementById('reserveRate').value) || 0;
    const currency = document.getElementById('currency').value;
    localStorage.setItem('baukostenrechner-current', JSON.stringify({ name, categories, settings: { vatRate, reserveRate, currency } }));
}

// Hook up global buttons
function setupButtons() {
    document.getElementById('addCategory').addEventListener('click', () => {
        categories.push({ name: `Kategorie ${categories.length + 1}`, positions: [] });
        renderCategories();
        computeAndRender();
    });
    document.getElementById('saveProject').addEventListener('click', () => {
        const name = document.getElementById('projectName').value.trim();
        if (!name) {
            alert('Bitte geben Sie einen Projektnamen ein.');
            return;
        }
        const vatRate = parseFloat(document.getElementById('vatRate').value) || 0;
        const reserveRate = parseFloat(document.getElementById('reserveRate').value) || 0;
        const currency = document.getElementById('currency').value || '';
        const projects = JSON.parse(localStorage.getItem('baukostenrechner-projects') || '{}');
        projects[name] = { categories: categories, settings: { vatRate, reserveRate, currency } };
        localStorage.setItem('baukostenrechner-projects', JSON.stringify(projects));
        alert('Projekt gespeichert!');
    });
    document.getElementById('exportProject').addEventListener('click', () => {
        const name = document.getElementById('projectName').value.trim() || 'Baukostenprojekt';
        const vatRate = parseFloat(document.getElementById('vatRate').value) || 0;
        const reserveRate = parseFloat(document.getElementById('reserveRate').value) || 0;
        const currency = document.getElementById('currency').value || '';
        const data = { name, categories, settings: { vatRate, reserveRate, currency } };
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${name.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    document.getElementById('importFile').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            try {
                const data = JSON.parse(ev.target.result);
                categories = data.categories || [];
                document.getElementById('projectName').value = data.name || '';
                document.getElementById('vatRate').value = data.settings?.vatRate ?? 20;
                document.getElementById('reserveRate').value = data.settings?.reserveRate ?? 10;
                document.getElementById('currency').value = data.settings?.currency ?? 'EUR';
                renderCategories();
                computeAndRender();
                alert('Projekt importiert!');
            } catch (err) {
                alert('Fehler beim Import: ' + err.message);
            }
        };
        reader.readAsText(file);
    });
}

// Initialization function
(function init() {
    // Load last edited project from localStorage
    const stored = JSON.parse(localStorage.getItem('baukostenrechner-current') || 'null');
    if (stored && stored.categories) {
        categories = stored.categories;
        document.getElementById('projectName').value = stored.name || '';
        document.getElementById('vatRate').value = stored.settings?.vatRate ?? 20;
        document.getElementById('reserveRate').value = stored.settings?.reserveRate ?? 10;
        document.getElementById('currency').value = stored.settings?.currency ?? 'EUR';
    } else {
        // Default categories list
        const defaultNames = ['Rohbau','Dach','Fenster/Türen','Haustechnik','Innenausbau','Außenanlagen','Planung/Nebenkosten'];
        categories = defaultNames.map(name => ({ name, positions: [] }));
    }
    setupButtons();
    renderCategories();
    computeAndRender();
})();
