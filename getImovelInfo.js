const axios = require('axios');
const cheerio = require('cheerio');
const j2cp = require('json2csv').Parser;
const fs = require('fs');
const { Worker } = require('worker_threads');
const mysql = require('mysql2');

let link = "https://figueirahome.pt/";
const links = [];
const dict_data = [];
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Foxmulder1970',
    database: 'Figueira_Home'
});


async function getUrls(url) {
    try {

        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        let anu = $(".home-properties-section-inner").find(".wrapper_properties_ele");
        anu.each(function () {
            link = $(this).find("a").attr("href");
            links.push(link);


        })

        if ($('a:contains("Próximo")').length > 0) {
            next_page = $('a:contains("Próximo")').attr("href");
            getUrls(next_page);
            return;

        }

        getImovelInfo(links);






    }
    catch (error) {
        console.error(error);
    }
}

async function getImovelInfo(url) {
    try {
        let platform_id = 0;
        

        for (var i = 0; i < url.length; i += 1) {
            const response = await axios.get(url[i]);
            const $ = cheerio.load(response.data)
            let img_data = [];
            let chars_data = [];
            var anuncio = {};
            var anuncio_mysql = {};
            anuncio["link"] = url[i];

            let images = $(".property-detail-slider-two img");
            images.each(function () {
                img = check_null($(this).attr("src"));
                img_data.push(img);

            })
            anuncio["images"] = img_data;
            

            let status = check_null($(".status").text());
            anuncio["addType"] = status;

            let titulo = check_null($(".rh_page__title").text());

            const scriptElement = $('#property-open-street-map-js-extra');
            const scriptContent = scriptElement.html();
            const regex = /propertyMapData\s*=\s*({.*})/;
            const match = scriptContent.match(regex);
            let propertyMapData = null;
            if (match) {
                const propertyMapDataString = match[1];
                propertyMapData = JSON.parse(propertyMapDataString);
            }
            let TipoDeImovel = propertyMapData["propertyType"];
            anuncio["assetType"] = TipoDeImovel;

            let distrito = "Coimbra";
            anuncio["district"] = distrito;

            let conselho = "Figueira da Foz";
            anuncio["county"] = conselho

            let freguesia = null;
            anuncio["parish"] = freguesia;

            let price = check_null(Stf($(".price").text()));
            anuncio["price"] = price;

            let Area_util = check_null(Stf($(".prop_area ").find(".figure").text()));
            anuncio["usefulArea"] = Area_util;

            let Area_bruta = check_null(Stf($(".prop_lot_size").find(".figure").text()));
            anuncio["grossArea"] = Area_bruta;

            let area_terreno = null;
            if (TipoDeImovel == "TERRENO") {
                area_terreno = Area_bruta;
            }
            anuncio["terrainArea"] = area_terreno;

            let num_quartos = check_null(Stf($(".prop_bedrooms").find(".figure").text()));
            anuncio["numberOfRooms"] = num_quartos;

            let num_div = null;
            anuncio["numberOfDivisions"] = num_div;
            let num_wc = check_null(Stf($(".prop_bathrooms").find(".figure").text()));
            anuncio["numberOfWcs"] = num_wc;

            let num_park_spots = check_null(Stf($(".prop_garages").find(".figure").text()));
            anuncio["numberOfParkingspots"] = num_park_spots;

            let condition = null;
            anuncio["condition_"] = condition;

            let ano_imovel = null;
            anuncio["buildingYear"] = ano_imovel;

            let num_piso = null;
            anuncio["floorNumber"] = num_piso;

            let cert_ene = check_null($(".energy-performance span").text());
            anuncio["energyEfficency"] = cert_ene;

            let chars = $(".rh-property-features-inner-wrap").find("a");
            chars.each(function () {
                char = ($(this).text());
                chars_data.push(char);

            })
            chars_data = check_null(chars_data);

            anuncio["subFeatures"] = chars_data;
            

            let desc_anun = check_null($(".rh_content p").text());
            anuncio["addText"] = desc_anun;


            anuncio["title"] = titulo;

            let agency = check_null($(".rh_footer__logo a").attr("title"));
            anuncio["agency"] = agency;

            let agency_ami = check_null(find_ami(($(".rh_footer__logo p").find(".text").text())));
            anuncio["ami"] = agency_ami;

            let latitude = check_null(parseFloat(propertyMapData["lat"]));
            anuncio["latitude"] = latitude;

            let longitude = check_null(parseFloat(propertyMapData["lng"]));
            anuncio["longitude"] = longitude

            let plataform_name = "Fegueiras Home Alfredo AI";
            anuncio["platform_name"] = plataform_name

            platform_id += 1;
            anuncio["platform_id"] = platform_id;

            let agencyUniqueId = titulo.split(" ").pop();
            anuncio["agencyUniqueId"] = agencyUniqueId;

            anuncio_mysql = anuncio;
            anuncio_mysql["images"]=img_data.join();
            anuncio_mysql["subFeatures"]= chars_data.join();

            dict_data.push({ anuncio });

            connection.query('INSERT INTO anuncios SET ?', anuncio_mysql, (error, results) => {
                if (error) {
                  console.error('Erro ao salvar dados no banco de dados:', error);
                } else {
                  console.log('Dados salvos no banco de dados');
                }
              });



        }
        console.log(dict_data);
        const parser = new j2cp();
        const csv = parser.parse(dict_data);
        fs.writeFileSync("./nodejs/anu_data.csv", csv);

        connection.end();

       
    }

    catch (error) {
        console.error(error);
    }


}






function Stf(string) {
    if (Boolean(string)) {
        if (string.indexOf("+") >= 0) {
            const Array_num = string.replace("+", " ").split(" ");
            let count = parseFloat(Array_num[0]) + parseFloat(Array_num[1]);
            return count;
        } else {

            let Str_Edit = string.replace("€", "").replace(".", "");
            let float = parseFloat(Str_Edit);
            return float;
        }
    }
}



function find_assetType(string) {
    let assetType = ["MORADIA", "APARTAMENTO", "HOTEL", "TERRENO", "LOJA", "ESCRITORIO", "ARMAZEM", "GARAGEM"];
    let Ts = ["T0", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"];
    let x = string.toUpperCase();
    let y = x.replace("+", " ");
    let TipoDeImovel = "";
    for (var i = 0; i < assetType.length; i += 1) {
        if (x.indexOf(assetType[i]) >= 0) {
            TipoDeImovel = assetType[i];
            return TipoDeImovel;
        }
    }
    if (TipoDeImovel.length == 0) {
        for (var j = 0; j < Ts.length; j += 1) {
            if (y.indexOf(Ts[j]) >= 0) {
                TipoDeImovel = "APARTAMENTO";
                return TipoDeImovel;
            }
        }
    }

}


function find_ami(string) {
    const arr = string.split(" ");
    let x = arr.indexOf("AMI") - 1;
    let ami = arr[x];

    return ami;
}


function check_null(string) {
    if (!Boolean(string)) {
        return null;
    } else {
        return string;
    }
}


function mysql_setup(){
    
    connection.connect((error) => {
        if (error) {
            console.error('Erro ao conectar ao banco de dados MySQL:', error);
            return;
        }
        console.log('Conectado ao banco de dados MySQL');
    });
    connection.query(`
CREATE TABLE IF NOT EXISTS anuncios (
id INT AUTO_INCREMENT PRIMARY KEY,
link VARCHAR(255),
images TEXT,
addType VARCHAR(255),
assetType VARCHAR(255),
district VARCHAR(255),
county VARCHAR(255),
parish VARCHAR(255),
price FLOAT,
usefulArea FLOAT,
grossArea FLOAT,
terrainArea FLOAT,
numberOfRooms INT,
numberOfDivisions INT,
numberOfWcs INT,
numberOfParkingspots INT,
condition_ VARCHAR(255),
buildingYear INT,
floorNumber INT,
energyEfficency VARCHAR(255),
subFeatures TEXT,
addText TEXT,
title VARCHAR(255),
agency VARCHAR(255),
ami VARCHAR(255),
latitude FLOAT,
longitude FLOAT,
platform_name VARCHAR(255),
platform_id INT,
agencyUniqueId VARCHAR(255)
)
`, (error) => {
        if (error) {
            console.error('Erro ao criar tabela:', error);
        } else {
            console.log('Tabela criada ou já existe');
        }
    });

}
mysql_setup();

getUrls(link);



