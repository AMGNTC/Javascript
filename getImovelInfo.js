const axios = require('axios');
const cheerio = require('cheerio');
const j2cp = require('json2csv').Parser;
const fs =require('fs');

let link = "https://figueirahome.pt/";
const links = [];
const dict_data = [];


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
            let TipoDeImovel = check_null(find_assetType(titulo));
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
            anuncio["condition"] = condition;

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

            let latitude = null;
            anuncio["latitude"] = latitude;

            let longitude = null;
            anuncio["longitude"] = longitude

            let plataform_name = "Fegueiras Home Alfredo AI";
            anuncio["platform_name"] = plataform_name

            platform_id += 1;
            anuncio["platform_id"] = platform_id;

            let agencyUniqueId = titulo.split(" ").pop();
            anuncio["agencyUniqueId"] = agencyUniqueId;

            dict_data.push({ anuncio });


        }
        console.log(dict_data);
        const parser = new j2cp();
        const csv = parser.parse(dict_data);
        fs.writeFileSync("./nodejs/anu_data.csv",csv);

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

getUrls(link);



