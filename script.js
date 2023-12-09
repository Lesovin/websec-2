let savedList=[]
let allStops =[]
let myMap
ymaps.ready(init);

let placemarks = new Map();


async function init() {
    if(localStorage.getItem('saved')!=null){
        savedList = JSON.parse(localStorage.getItem('saved'))
        generateSavedStops()
    }
    generateSavedStops()
    myMap = new ymaps.Map("Map", {
        center: [53.212, 50.18],
        zoom: 17,
        controls: ['geolocationControl']
    });

    await getAllStops().then(async stops => {
        let arrStop = stops.getElementsByTagName("stop")
        for (let i = 0; i < arrStop.length; i++) {
            const KS_ID = arrStop[i].getElementsByTagName("KS_ID")[0].textContent
            const title_station = arrStop[i].getElementsByTagName("title")[0].textContent
            const adjacentStreet = arrStop[i].getElementsByTagName("adjacentStreet")[0].textContent
            const direction = arrStop[i].getElementsByTagName("direction")[0].textContent
            const x = arrStop[i].getElementsByTagName("latitude")[0].textContent
            const y = arrStop[i].getElementsByTagName("longitude")[0].textContent
            const transferObj = {
                "KS_ID":KS_ID,
                "title_station":title_station,
                "adjacent_street":adjacentStreet,
                "direction": direction,
                "x": x,
                "y": y
            }
            allStops.push(transferObj)
            localStorage.setItem("res", JSON.stringify(allStops))
            let placemark = new ymaps.Placemark(
                [arrStop[i].getElementsByTagName("latitude")[0].textContent, arrStop[i].getElementsByTagName("longitude")[0].textContent],
                {
                    balloonContentHeader: "<img id='img_plm_"+KS_ID+"' src='heart.png' onclick='Save("+JSON.stringify(transferObj)+")' alt=\"photo\"'/>"+
                        title_station,
                    balloonContentBody: ("Остановка " + arrStop[i].getElementsByTagName("adjacentStreet")[0].textContent +
                    " " + arrStop[i].getElementsByTagName("direction")[0].textContent),
                    hintContent: arrStop[i].getElementsByTagName("title")[0].textContent
                }
            );

            setPlacemarkColor(placemark, arrStop[i])

            placemark.events.add('balloonopen', function (e) {
                placemark.properties.set('balloonContentFooter', "Идет загрузка...");
                getInfoByStop(KS_ID).then((stop) => {
                    let newContent = "";
                    let transport = stop.getElementsByTagName("transport")
                    for (let i = 0; i < transport.length; i++) {
                        newContent += "<div class='bus'>"+transport[i].getElementsByTagName("type")[0].textContent + " " +
                            transport[i].getElementsByTagName("number")[0].textContent + " будет через " + transport[i].getElementsByTagName("time")[0].textContent + "мин"+"<br/></div>"
                    }
                    placemark.properties.set('balloonContentFooter', newContent);
                })
                if(checkKSInSaved(KS_ID)){
                    placemark.properties.set('balloonContentHeader', "<img id='img_plm_"+KS_ID+"' src='heart_full.png' onclick='Save("+JSON.stringify(transferObj)+")' alt=\"photo\"'/>"+
                        title_station);
                }
            });

            placemarks.set(KS_ID, placemark)
            myMap.geoObjects.add(placemark);
        }
    })
}

function checkKSInSaved(KS_ID){
    if(savedList !== null){
        return !!savedList.filter(function (item) {
            return item.KS_ID === KS_ID;
        }).length;
    }
}


function Save(transferObj){
    let img = document.getElementById('img_plm_'+transferObj.KS_ID)
    if(checkKSInSaved(transferObj.KS_ID)){
        img.src = "heart.png"
        savedList = savedList.filter((item) => { return item.KS_ID !== transferObj.KS_ID; });
        localStorage.setItem("saved", JSON.stringify(savedList))
        generateSavedStops()
    }else {
        img.src = "heart_full.png"
        savedList.push(transferObj)
        localStorage.setItem("saved", JSON.stringify(savedList))
        generateSavedStops()
    }
}

function setPlacemarkColor(placemark, stop){
    if(stop.getElementsByTagName("trams")[0].textContent !== ""){
        placemark.options.set('preset', 'islands#redDotIcon')
    }else if(stop.getElementsByTagName("trolleybuses")[0].textContent !== ""){
        placemark.options.set('preset', 'islands#blueDotIcon')
    }else if(stop.getElementsByTagName("metros")[0].textContent !== ""){
        placemark.options.set('preset', 'islands#blueRapidTransitIcon')
    }else if(stop.getElementsByTagName("electricTrains")[0].textContent !== ""){
        placemark.options.set('preset', 'islands#blueRailwayIcon')
    }else if(stop.getElementsByTagName("riverTransports")[0].textContent !== ""){
        placemark.options.set('preset', 'islands#blueWaterwayIcon')
    }else{
        placemark.options.set('preset', 'islands#greenDotIcon')
    }

}

async function getAllStops(){
    const response = await fetch("https://tosamara.ru/api/v2/classifiers/stopsFullDB.xml");
    const str = await response.text();
    return new DOMParser().parseFromString(str, "application/xml");
}

async function getInfoByStop(KS_ID) {
    const response = await fetch(`https://tosamara.ru/api/v2/xml?method=getFirstArrivalToStop&KS_ID=${KS_ID}&os=android&clientid=test&authkey=${SHA1(KS_ID + "just_f0r_tests")}`);
    const str = await response.text();
    return new DOMParser().parseFromString(str, "application/xml");
}

function generateSavedStops(){
    let window_saved_stop = document.querySelector('.overlay-transport');
    window_saved_stop.innerHTML = "<button id=button onclick='toggleSearch()'>Поиск по всем</button>";
    window_saved_stop.innerHTML +="<h2>Избранное</h2>";
    probel = ' ';
    for (let i = 0; i < savedList.length; i++){
        const newItem = document.createElement('div');
                newItem.innerHTML = `
                    <div class="saved-stop-info">
                        <h2>${savedList[i].title_station}</h2>
                        <h4>${savedList[i].adjacent_street+probel+savedList[i].direction}</h4>
                    </div>
			    `;
        newItem.addEventListener("click", ()=>{
            myMap.setCenter([savedList[i].x, savedList[i].y]);
            myMap.setZoom(19);
            placemarks.get(savedList[i].KS_ID).balloon.open();
        })
        window_saved_stop.append(newItem)
    }
}

function toggleSearch() {
    let listElem = document.querySelector('.overlay-transport');
    listElem.innerHTML = "<button onclick='generateSavedStops()' style='margin:center;'>Назад</button>";
    listElem.innerHTML += "<input id=\"search-input\" type=\"text\" placeholder=\"Поиск...\" list=\"search-list\">";
    listElem.innerHTML += "<div id='found-stops' style='display: flex; flex-direction: column; margin: 3px'></div>";
    let foundList = document.querySelector("#found-stops");
    let searchField = document.querySelector("#search-input");
    searchField.addEventListener("input", () => {
        if (searchField.value < 4) return;
        foundList.innerHTML = '';
        for (let i = 0; i < allStops.length; i++) {
            probel = ' ';
            if (allStops[i].title_station.toLowerCase().includes(searchField.value.toLowerCase())) {
                const newItem = document.createElement('div');
                newItem.innerHTML = `
                    <div class="saved-stop-info">
                        <h2>${allStops[i].title_station}</h2>
                        <h4>${allStops[i].adjacent_street+probel+allStops[i].direction}</h4>
                    </div>
			    `;
                foundList.appendChild(newItem);
                newItem.addEventListener('click', () => { 
                    myMap.setCenter([allStops[i].x, allStops[i].y]);
                    myMap.setZoom(19);
                    placemarks.get(allStops[i].KS_ID).balloon.open();
                });
            }
            
        }
    })
    
}


function SHA1(msg){function rotate_left(n,s){var t4=(n<<s)|(n>>>(32-s));return t4;};function lsb_hex(val){var str='';var i;var vh;var vl;for(i=0;i<=6;i+=2){vh=(val>>>(i*4+4))&0x0f;vl=(val>>>(i*4))&0x0f;str+=vh.toString(16)+vl.toString(16);}
    return str;};function cvt_hex(val){var str='';var i;var v;for(i=7;i>=0;i--){v=(val>>>(i*4))&0x0f;str+=v.toString(16);}
    return str;};function Utf8Encode(string){string=string.replace(/\r\n/g,'\n');var utftext='';for(var n=0;n<string.length;n++){var c=string.charCodeAt(n);if(c<128){utftext+=String.fromCharCode(c);}
else if((c>127)&&(c<2048)){utftext+=String.fromCharCode((c>>6)|192);utftext+=String.fromCharCode((c&63)|128);}
else{utftext+=String.fromCharCode((c>>12)|224);utftext+=String.fromCharCode(((c>>6)&63)|128);utftext+=String.fromCharCode((c&63)|128);}}
    return utftext;};var blockstart;var i,j;var W=new Array(80);var H0=0x67452301;var H1=0xEFCDAB89;var H2=0x98BADCFE;var H3=0x10325476;var H4=0xC3D2E1F0;var A,B,C,D,E;var temp;msg=Utf8Encode(msg);var msg_len=msg.length;var word_array=new Array();for(i=0;i<msg_len-3;i+=4){j=msg.charCodeAt(i)<<24|msg.charCodeAt(i+1)<<16|msg.charCodeAt(i+2)<<8|msg.charCodeAt(i+3);word_array.push(j);}
    switch(msg_len % 4){case 0:i=0x080000000;break;case 1:i=msg.charCodeAt(msg_len-1)<<24|0x0800000;break;case 2:i=msg.charCodeAt(msg_len-2)<<24|msg.charCodeAt(msg_len-1)<<16|0x08000;break;case 3:i=msg.charCodeAt(msg_len-3)<<24|msg.charCodeAt(msg_len-2)<<16|msg.charCodeAt(msg_len-1)<<8|0x80;break;}
    word_array.push(i);while((word_array.length % 16)!=14)word_array.push(0);word_array.push(msg_len>>>29);word_array.push((msg_len<<3)&0x0ffffffff);for(blockstart=0;blockstart<word_array.length;blockstart+=16){for(i=0;i<16;i++)W[i]=word_array[blockstart+i];for(i=16;i<=79;i++)W[i]=rotate_left(W[i-3]^W[i-8]^W[i-14]^W[i-16],1);A=H0;B=H1;C=H2;D=H3;E=H4;for(i=0;i<=19;i++){temp=(rotate_left(A,5)+((B&C)|(~B&D))+E+W[i]+0x5A827999)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp;}
        for(i=20;i<=39;i++){temp=(rotate_left(A,5)+(B^C^D)+E+W[i]+0x6ED9EBA1)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp;}
        for(i=40;i<=59;i++){temp=(rotate_left(A,5)+((B&C)|(B&D)|(C&D))+E+W[i]+0x8F1BBCDC)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp;}
        for(i=60;i<=79;i++){temp=(rotate_left(A,5)+(B^C^D)+E+W[i]+0xCA62C1D6)&0x0ffffffff;E=D;D=C;C=rotate_left(B,30);B=A;A=temp;}
        H0=(H0+A)&0x0ffffffff;H1=(H1+B)&0x0ffffffff;H2=(H2+C)&0x0ffffffff;H3=(H3+D)&0x0ffffffff;H4=(H4+E)&0x0ffffffff;}
    var temp=cvt_hex(H0)+cvt_hex(H1)+cvt_hex(H2)+cvt_hex(H3)+cvt_hex(H4);return temp.toLowerCase();}