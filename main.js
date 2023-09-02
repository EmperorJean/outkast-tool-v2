const squadContainer = document.getElementById("squad-container");
const squadlessContainer = document.getElementById("squadless-item-container");
const createButton = document.getElementById('ext-menu-header-content-groupcontrol-creategroup');
const deployAssist = document.createElement("button");

let queue = [];
let settings = document.createElement("i");
let updateOks = document.createElement("i");
let menu;
let deployedOutkasts;

async function initialize() {
    // adding the gear icon to the website
    settings.setAttribute("class", "fas fa-gear");
    document.getElementsByClassName("header-right")[0].appendChild(settings);
    updateOks.setAttribute("class", "fa fa-refresh");
    updateOks.style['color'] = "red";
    document.getElementsByClassName("header-right")[0].insertBefore(updateOks, document.getElementsByClassName("header-right")[0].children[2]);
    menu = document.getElementById('ext-menu');
    settings.addEventListener('click', launchMenu);
    updateOks.addEventListener('click', () => {
        localStorage.removeItem('wallet');
        localStorage.removeItem('squadfull');
        localStorage.removeItem('squadless');
        localStorage.removeItem('isSetupComplete');
        alert('Reset complete, go ahead and hit the gear to start over')
        window.location.reload();
    });
    deployAssist.setAttribute('onclick', 'dispatch()');
}

async function fetchDataForAddress(ethAddress, skip = 0, allData = []) {
    const response = await fetch(`https://api.mnnt.io/collections/outkasts/tokens?owner=${ethAddress}&skip=${skip}`);
    const data = await response.json();

    if (data && data.length > 0) {
        data.forEach(item => {
            item.level = calculateLevel(item.experience);
        });
        allData.push(...data);

        // Fetch the next set of items, skipping the number of items we already have
        return fetchDataForAddress(ethAddress, skip + data.length, allData);
    } else {
        // No more items, return all data
        return allData;
    }
}

function launchMenu() {
    // Show and hide the menu
    if (menu.style['display'] === 'block') {
        menu.style['display'] = 'none';
    } else {
        // Check if the user has already gone through the setup
        const isSetupComplete = localStorage.getItem('isSetupComplete');

        if (!isSetupComplete) {
            // Getting address first time to load oks
            const ethAddress = prompt("Please enter your Ethereum wallet address:");
            if (ethAddress) {
                fetchDataForAddress(ethAddress).then(items => {
                    // Populate the squadless list with the fetched items
                    items.forEach(item => {
                        const squadlessData = {
                            id: item.token_id,
                            name: item.name,
                            level: item.level
                        };
                        squadlessContainer.appendChild(createSquadlessItem(squadlessData));
                    });

                    // Mark setup as complete to avoid showing the prompt again
                    localStorage.setItem('wallet', ethAddress);
                    localStorage.setItem('isSetupComplete', 'true');
                    // After populating the squadless list
                    document.getElementById("squadless-count").textContent = items.length;

                }).then(() => {
                    saveState();
                    menu.style['display'] = 'block';
                });
            }
        }
        fetchOutkastsStatus().then(() => {
            updateSquadsStatus();
        });
        menu.style['display'] = 'block';
    }
}


function deploy(oks) {
    for (let i = 0; i < oks.length; i++) {
        let elm = document.createElement("button");
        document.body.append(elm);
        elm.setAttribute('onclick', `addOutkast('${oks[i].name}', ${oks[i].outkast}, '${oks[i].level}', '${oks[i].power}')`);
        elm.click();
        elm.remove();
    }
    // Simulates a click on dispatch
    deployAssist.click();
}

function calculateLevel(experience) {
    let i = 0;
    let level = 0;

    while (i <= experience) {
        level++;
        i += Math.round(1000 * Math.pow(1.1, level - 1));
    }

    if (level > 100)
        return 100;

    return level;
}

function createSquad(squadName, members) {
    const squadElement = document.createElement("div");
    squadElement.className = "ext-menu-main-content-squad";

    let squadInnerHTML = `
        <div class="squad-move-controls">
            <button class="squad-move-up">⬆️</button>
            <button class="squad-move-down">⬇️</button>
            
        </div>
        <div class="squad-content">
            <div class="ext-menu-main-content-squad-name">
            <span class="squad-name-text">${squadName}</span>
            <span class="squad-total-level">Total Power: 0</span>
            <button class="trash-squad"><i class="fa fa-trash trash-squad" aria-hidden="true"></i></button>
            <button id="dispatch-mission-icon" class="dispatch-mission">Deploy</button>
            </div>
            <div class="ext-menu-main-content-squad-members">
    `;

    members.forEach(member => {
        squadInnerHTML += `
            <div class="ext-menu-main-content-squad-member">
                <button class="squad-member-delete">❌</button>
                <img src="https://mnnt.io/collections/outkasts/low_res/${member.id}" alt="${member.name}">
                <div class="member-name">${member.name}</div>
                <div class="member-id">#${member.id}</div>
                <div class="member-level">Level: ${member.level}</div> <!-- Added this line -->
            </div>
        `;
    });

    squadInnerHTML += `</div></div>`;
    squadElement.innerHTML = squadInnerHTML;
    let totalLevel = members.reduce((acc, member) => acc + parseInt(member.level), 0);
    squadElement.querySelector('.squad-total-level').textContent = `Total Power: ${totalLevel}*`;


    return squadElement;
}

function createSquadlessItem(member) {
    const squadlessItemElement = document.createElement("div");
    squadlessItemElement.className = "ext-menu-main-content-item";
    squadlessItemElement.innerHTML = `
        <img src="https://mnnt.io/collections/outkasts/low_res/${member.id}" alt="${member.name}">
        <div class="ext-menu-main-content-item-info">
        <div class="member-name">${member.name}</div>
        <div class="member-id">#${member.id}</div>
        <div class="member-level">Level: ${member.level}</div> <!-- Added this line -->

        </div>
        <button class="ext-menu-main-content-item-add" data-id=${member.id}>+</button>
    `;
    document.getElementById("squadless-count").textContent = parseInt(document.getElementById("squadless-count").textContent) + 1;
    return squadlessItemElement;
}

// Function to update the queue display
function updateQueueDisplay() {
    for (let i = 1; i <= 4; i++) {
        const imgElement = document.getElementById(`queue-image-${i}`);
        if (queue[i - 1]) {
            imgElement.src = `https://mnnt.io/collections/outkasts/low_res/${queue[i - 1].id}`;
        } else {
            imgElement.src = "https://mnnt.io/collections/outkasts/med_res/1";
        }
    }
}

function updateTotalLevelForSquad(squadElement) {
    const members = squadElement.querySelectorAll('.ext-menu-main-content-squad-member');
    let totalLevel = 0;

    members.forEach(member => {
        totalLevel += parseInt(member.querySelector('.member-level').textContent.split(': ')[1]);
    });

    squadElement.querySelector('.squad-total-level').textContent = `Total Level: ${totalLevel}`;
}


document.querySelector('.ext-menu-main-squadless').addEventListener('click', function (event) {
    let clickedElement = event.target;
    // user can click anywhere on a squadless item to queue it up
    let itemDiv = clickedElement.closest('.ext-menu-main-content-item');

    if (itemDiv) {
        let btn = itemDiv.querySelector('.ext-menu-main-content-item-add');
        const itemId = btn.getAttribute('data-id');
        const itemName = itemDiv.querySelector('.member-name').textContent;
        const level = itemDiv.querySelector('.member-level').textContent.split(': ')[1];

        const item = {
            id: itemId,
            name: itemName,
            level: level
        };

        // Check if item is already in queue
        const itemIndex = queue.findIndex(q => q.id === item.id);

        if (itemIndex === -1) {
            // Add to queue
            if (queue.length < 4) {
                queue.push(item);
                btn.textContent = '-';
                btn.style.backgroundColor = 'red';
            }
        } else {
            // Remove from queue
            queue.splice(itemIndex, 1);
            btn.textContent = '+';
            btn.style.backgroundColor = '';  // Reset to original color
        }

        updateQueueDisplay();
    }
});



createButton.addEventListener('click', () => {
    // Ensure there are items in the queue
    if (queue.length === 0) {
        alert("No members selected to create a squad.");
        return;
    }

    // Generate the squad using the createSquad function
    const squadName = document.getElementById('ext-menu-header-content-groupcontrol-groupname').value || "Unnamed Squad";
    const squadd = createSquad(squadName, queue);

    // Append the squad to the squadfull area
    squadContainer.appendChild(squadd);

    // Remove the added items from the squadless list
    queue.forEach(item => {
        const itemElement = document.querySelector(`.ext-menu-main-content-item-add[data-id="${item.id}"]`).closest('.ext-menu-main-content-item');
        if (itemElement) {
            itemElement.remove();
            document.getElementById("squadless-count").textContent = parseInt(document.getElementById("squadless-count").textContent) - 1;
        }
    });

    // Reset the queue and update the queue display
    queue = [];
    updateQueueDisplay();

    // Reset the buttons in the squadless area
    document.querySelectorAll('.ext-menu-main-content-item-add').forEach((btn) => {
        btn.textContent = '+';
        btn.style.backgroundColor = ''; // Reset to original color
    });

    saveState()
});

document.getElementById("ext-menu-header-content-groupcontrol-resetgroup").addEventListener('click', () => {
    // Reset the queue and update the queue display
    queue = [];
    updateQueueDisplay();

    // Reset the buttons in the squadless area
    document.querySelectorAll('.ext-menu-main-content-item-add').forEach((btn) => {
        btn.textContent = '+';
        btn.style.backgroundColor = ''; // Reset to original color
    });

    document.getElementById('ext-menu-header-content-groupcontrol-groupname').value = ""
});

squadContainer.addEventListener('click', function (event) {
    if (event.target.classList.contains('squad-move-up')) {
        // Handle move up
        let currentSquad = event.target.closest('.ext-menu-main-content-squad');
        let previousSquad = currentSquad.previousElementSibling;

        if (previousSquad) {  // if there's a squad above
            currentSquad.parentNode.insertBefore(currentSquad, previousSquad);
        }

    } else if (event.target.classList.contains('squad-move-down')) {
        // Handle move down
        let currentSquad = event.target.closest('.ext-menu-main-content-squad');
        let nextSquad = currentSquad.nextElementSibling;

        if (nextSquad) {  // if there's a squad below
            currentSquad.parentNode.insertBefore(nextSquad, currentSquad);
        }
    } else if (event.target.classList.contains('trash-squad')) {
        // Get the squad to be deleted
        let currentSquad = event.target.closest('.ext-menu-main-content-squad');

        // Extract members from the squad
        let members = Array.from(currentSquad.querySelectorAll('.ext-menu-main-content-squad-member'));
        members.forEach(member => {
            // Extract member details
            let name = member.querySelector('.member-name').textContent;
            let id = member.querySelector('.member-id').textContent.slice(1); // remove the #
            let level = member.querySelector('.member-level').textContent.split(': ')[1];

            // Create a new squadless item for the member
            let squadlessItem = createSquadlessItem({ id: id, name: name, level: level });

            // Add the new squadless item to the squadless section
            document.querySelector('.ext-menu-main-squadless .ext-menu-main-content').appendChild(squadlessItem);
        });

        // Delete the squad
        currentSquad.remove();
        updateTotalLevelForSquad(currentSquad);
    } else if (event.target.classList.contains('squad-member-delete')) {
        // Get the squad member element
        const memberElement = event.target.closest('.ext-menu-main-content-squad-member');
        const squad = memberElement.closest('.ext-menu-main-content-squad');
        const squadMembers = squad.querySelectorAll('.ext-menu-main-content-squad-member');

        // Extract member data (id, name, level) from the memberElement
        const memberId = memberElement.querySelector('img').src.split('/').pop();
        const memberName = memberElement.querySelector('.member-name').textContent;
        const memberLevel = memberElement.querySelector('.member-level').textContent.split(': ')[1];

        // Remove the member from the squad in the DOM
        memberElement.remove()

        // Add the member back to the squadless list
        const squadlessItem = createSquadlessItem({ id: memberId, name: memberName, level: memberLevel });
        squadlessContainer.appendChild(squadlessItem);

        if (squadMembers.length === 1) {
            squad.remove();
        }
        updateTotalLevelForSquad(squad);
    } else if (event.target.classList.contains('dispatch-mission')) {
        // Get the squad to be dispatched
        let currentSquad = event.target.closest('.ext-menu-main-content-squad');
        // Extract member details from the squad for dispatching
        let members = Array.from(currentSquad.querySelectorAll('.ext-menu-main-content-squad-member')).map(memberElement => {
            let name = memberElement.querySelector('.member-name').textContent;
            let outkast = memberElement.querySelector('.member-id').textContent.slice(1); // removing the '#'
            let level = memberElement.querySelector('.member-level').textContent.split(': ')[1];
            let power = level;

            return { name, outkast, level, power };
        });
        deploy(members);
    }

    saveState()
});

function saveState() {
    const squadlessData = [];
    document.querySelectorAll('.ext-menu-main-squadless .ext-menu-main-content-item').forEach(member => {
        // Extract member details
        let name = member.querySelector('.member-name').textContent;
        let id = member.querySelector('.member-id').textContent.slice(1); // remove the #
        let level = member.querySelector('.member-level').textContent.split(': ')[1]; // Extract the level
        squadlessData.push({ id, name, level });
    });

    const squadfullData = [];
    document.querySelectorAll('.ext-menu-main-squadfull .ext-menu-main-content-squad').forEach(squad => {
        const squadName = squad.querySelector('.squad-name-text').textContent;
        const members = [];
        squad.querySelectorAll('.ext-menu-main-content-squad-member').forEach(member => {
            // Extract member details
            let name = member.querySelector('.member-name').textContent;
            let id = member.querySelector('.member-id').textContent.slice(1); // remove the #
            let level = member.querySelector('.member-level').textContent.split(': ')[1]; // Extract the level
            members.push({ id, name, level });
        });
        squadfullData.push({ name: squadName, members });
    });

    localStorage.setItem('squadless', JSON.stringify(squadlessData));
    localStorage.setItem('squadfull', JSON.stringify(squadfullData));
}

function loadState() {
    const squadlessData = JSON.parse(localStorage.getItem('squadless') || "[]");
    const squadfullData = JSON.parse(localStorage.getItem('squadfull') || "[]");

    // Clear the current display
    const squadlessContainer = document.querySelector('.ext-menu-main-squadless .ext-menu-main-content');
    squadlessContainer.innerHTML = '';
    const squadfullContainer = document.querySelector('.ext-menu-main-squadfull .ext-menu-main-content');
    squadfullContainer.innerHTML = '';

    // Regenerate squadless items
    squadlessData.forEach(member => {
        const item = createSquadlessItem(member);
        squadlessContainer.appendChild(item);
    });

    // Regenerate squads
    squadfullData.forEach(squad => {
        const squadElement = createSquad(squad.name, squad.members);
        squadfullContainer.appendChild(squadElement);
    });
}

function exportStateToJson() {
    let squadlessMembers = [];
    let squads = [];

    // Get all squadless members
    document.querySelectorAll('.ext-menu-main-squadless .ext-menu-main-content-item').forEach(member => {
        // Extract member details
        let name = member.querySelector('.member-name').textContent;
        let id = member.querySelector('.member-id').textContent.slice(1); // remove the #
        let level = member.querySelector('.member-level').textContent.split(": ")[1]; // extract the level

        squadlessMembers.push({ id, name, level });
    });

    // Get all squads and their members
    document.querySelectorAll('.ext-menu-main-squadfull .ext-menu-main-content-squad').forEach(squad => {
        let squadName = squad.querySelector('.squad-name-text').textContent;
        let members = [];
        squad.querySelectorAll('.ext-menu-main-content-squad-member').forEach(member => {
            // Extract member details
            let name = member.querySelector('.member-name').textContent.split(" ")[0];
            let id = member.querySelector('.member-id').textContent.slice(1); // remove the #
            let level = member.querySelector('.member-level').textContent.split(": ")[1]; // extract the level

            members.push({ id, name, level });
        });
        squads.push({ squadName, members });
    });

    const currentState = {
        squadlessMembers,
        squads
    };

    // Convert to JSON and export
    const jsonFile = JSON.stringify(currentState, null, 2);
    const blob = new Blob([jsonFile], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'squad.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}


document.getElementById('exportJson').addEventListener('click', function () {
    exportStateToJson();
});

document.getElementById('loadJson').addEventListener('click', function () {
    const input = document.getElementById('groupImport');
    input.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsText(file, 'UTF-8');
            reader.onload = function (evt) {
                try {
                    const uploadedState = JSON.parse(evt.target.result);

                    // Clear the current display
                    const squadlessContainer = document.querySelector('.ext-menu-main-squadless .ext-menu-main-content');
                    squadlessContainer.innerHTML = '';
                    const squadfullContainer = document.querySelector('.ext-menu-main-squadfull .ext-menu-main-content');
                    squadfullContainer.innerHTML = '';

                    // Regenerate squadless items
                    uploadedState.squadlessMembers.forEach(member => {
                        const item = createSquadlessItem(member);
                        squadlessContainer.appendChild(item);
                    });

                    // Regenerate squads
                    uploadedState.squads.forEach(squad => {
                        const squadElement = createSquad(squad.squadName, squad.members);
                        squadfullContainer.appendChild(squadElement);
                    });

                } catch (error) {
                    console.error("Error parsing JSON:", error);
                }
            };
            reader.onerror = function (evt) {
                console.error("Error reading file");
            }
        }
    });
    // Trigger the input file selection
    input.click();
});

async function fetchOutkastsStatus() {
    const wallet = localStorage.getItem("wallet");
    let skip = 0;
    let data = [];
    
    while(true) {
        const response = await fetch(`https://api.mnnt.io/collections/outkasts/tokens?owner=${wallet}&skip=${skip}`);
        const chunk = await response.json();
        if(chunk.length === 0) break;  // Stop when there's no more data to fetch
        data = data.concat(chunk);
        skip += chunk.length;  // Increase the 'skip' for the next set of data
    }

    // Filter outkasts that are deployed
    deployedOutkasts = data.filter(outkast => outkast.deployed_to !== null);
}

function updateSquadsStatus() {
    const squads = document.querySelectorAll('.ext-menu-main-content-squad');

    squads.forEach(squad => {
        const members = squad.querySelectorAll('.ext-menu-main-content-squad-member');
        let isDeployed = false;

        members.forEach(member => {
            const memberId = member.querySelector('.member-id').textContent.slice(1); // remove the #
            if (deployedOutkasts.some(outkast => outkast.token_id == memberId)) {
                isDeployed = true;
            }
        });

        if (isDeployed) {
            // Add an indicator for deployed outkasts
            const badge = document.createElement('span');
            badge.innerText = "On Mission";
            badge.classList.add('mission-badge');
            squad.appendChild(badge);
        }
    });
}
initialize();
loadState();