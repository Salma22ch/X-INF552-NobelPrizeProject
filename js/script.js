// general paramters
const MAP_W = 600;
const MAP_H = 400;
const CHART_W = 700;
const Chart_H = 400;

const PROJECTIONS = {
  ER: d3
    .geoMercator()
    .scale(90)
    // .center([0,20])
    .translate([MAP_W / 2, MAP_H / 1.4]),
};

var ctx = {
  undefinedColor: "#AAA",
  YEAR: "2016", // initial state no year selected
  TRANSITION_DURATION: 3000,
  catg: ["Chemistry", "Literature", "Medicine", "Peace", "Physics", "Economics"],
  color_scale: d3.scaleOrdinal(["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"]),
  sex: ["Male", "Female"],
  type: ["Individual", "Organization"],
  selected_coutry:"United States",
  winner: [],
  links: [],
  data_all_fields: [],
  data_one: [],
  data_original_zero: [],
  data_original_one: [],
  country_centroid: [],
  countries_of_winners: [],
  countries_of_winners_v_2: [],
  countries_of_winners_winning_times: [],
  max_winning_times: 0,
  min_winning_times: 1,
};

// create la vis

var createViz = function () {
  console.log("Using D3 v" + d3.version);
  Object.keys(PROJECTIONS).forEach(function (k) {
    PROJECTIONS[k].rotate([0, 0]).center([0, 0]);
  });
  var svgMap = d3.select("#map").append("svg").attr("id", "svgmap").style("cursor", "zoom-in");
  var map=d3.select("#svgmap").append("g").attr("id", "map").style("pointer-events", "all").style("cursor", "pointer");
  var links=d3.select("#svgmap").append("g").attr("id", "links").style("pointer-events", "all").style("cursor", "pointer");
  var nodes=d3.select("#svgmap").append("g").attr("id", "nodes").style("pointer-events", "all").style("cursor", "pointer");
  var origins=d3.select("#svgmap").append("g").attr("id", "origins").style("pointer-events", "all").style("cursor", "pointer");

  var svgChart = d3.select("#ChartGrid").append("svg").attr("id", "StackBachChart");
  svgMap.attr("width", MAP_W);
  svgMap.attr("height", MAP_H);
  svgChart.attr("width", CHART_W);
  svgChart.attr("height", Chart_H);



  svgMap.call(d3.zoom().scaleExtent([1, 8]).on("zoom", doZoom));

   function doZoom(event) {
    map.attr("transform", event.transform);
    links.attr("transform", event.transform);
    nodes.attr("transform", event.transform);
    origins.attr("transform", event.transform);
  }

  loadData(svgMap, svgChart);
};

// data

var loadData = function (svgMap, svgChart) {
  // ... load data, transform it, store it in ctx
  Promise.all([
    d3.json("./data/ne_50m_admin_0_countries.geojson"),
    d3.csv("./data/csv_nobel-prize-2016.csv"),
  ]).then(function (data) {

    ctx.data_original_zero = data[0];
    ctx.data_original_one = data[1];

    // remove antractica continent
    data[0].features = data[0].features.filter(function (d) {
      return d.properties.continent !== "Antarctica";
    });



    var list = [];
    for (let i = 0; i < data[1].length; i++) {
      var i_country = data[1][i]["OrganizationCountry"];
      var o_country = data[1][i]["BirthCountry"];
      if (i_country !== "") list.push(i_country);
      if (i_country === "" && o_country !== "") list.push(o_country);
      if (i_country !== "" && !ctx.countries_of_winners.includes(i_country)) {
        ctx.countries_of_winners.push(i_country);
      }
      if (
        i_country === "" &&
        o_country !== "" &&
        !ctx.countries_of_winners.includes(o_country)
      ) {
        ctx.countries_of_winners.push(o_country);
      }

    }

    ctx.countries_of_winners_v_2 = ctx.countries_of_winners;
    cumulateData(data[1], ctx.YEAR);


    // count the number of wins for each country
    for (var i = 0; i < ctx.countries_of_winners.length; i++) {
      var nb = countOccurrences(list, ctx.countries_of_winners[i]);
      ctx.countries_of_winners_winning_times.push([
        ctx.countries_of_winners[i],
        nb,
      ]);

    }


    for (var i = 0; i < data[0].features.length; i++) {
      if (
        ctx.countries_of_winners.includes(
          data[0].features[i].properties["name"]
        )
      ) {
        var obj=ctx.data_all_fields.filter(d=>d.country===data[0].features[i].properties["name"])[0];
        data[0].features[i].properties["nbv"] =obj.nb_winning;
        // console.log(data[0].features[i])
      } else {
        data[0].features[i].properties["nbv"] = "0";
      }
    }


    

    SetNodesposition(svgMap);
    makeMap(svgMap);
    makeControllers();
    makeChart(svgChart);
    updateData();
    updateCountries();
    createAgeLineChart();
    createUnivBarChart();



  });
};

var cumulateData = function (dataor, year) {
  ctx.data_all_fields = [];
  ctx.winner = [];

  // cumulative data with all fields
  var data = dataor.filter(function (d) {
    return d.Year <= year && ctx.catg.includes(d.Category) && ctx.sex.includes(d.Sex) && ctx.type.includes(d.LaureateType);
  });

  // years list
  let years = range(1901, parseInt(year));
  var data_filterd;
  for (let k in ctx.countries_of_winners_v_2) {
    let nb_array = [0, 0, 0, 0, 0, 0]; // relinitialise for each country

    for (let j in years) {
      // second filter
      var data_filterd = data.filter(function (d) {
        return (
          d.Year == years[j] &&
          (d.OrganizationCountry === ctx.countries_of_winners_v_2[k] ||
            d.BirthCountry === ctx.countries_of_winners_v_2[k])
        );
      });

      // 3rd loop
      for (let i = 0; i < data_filterd.length; i++) {
        if (data_filterd[i]["Category"] === "Chemistry")
          nb_array[0] = nb_array[0] + 1;
        if (data_filterd[i]["Category"] === "Literature")
          nb_array[1] = nb_array[1] + 1;
        if (data_filterd[i]["Category"] === "Medicine")
          nb_array[2] = nb_array[2] + 1;
        if (data_filterd[i]["Category"] === "Peace")
          nb_array[3] = nb_array[3] + 1;
        if (data_filterd[i]["Category"] === "Physics")
          nb_array[4] = nb_array[4] + 1;
        if (data_filterd[i]["Category"] === "Economics")
          nb_array[5] = nb_array[5] + 1;
      }
    }

    ctx.data_all_fields.push({
      tillyear: year,
      country: ctx.countries_of_winners_v_2[k],
      nb_winning: nb_array.reduce((a, b) => a + b, 0), // nb of wining until this year to-do later*
      Chemistry: nb_array[0],
      Literature: nb_array[1],
      Medicine: nb_array[2],
      Peace: nb_array[3],
      Physics: nb_array[4],
      Economics: nb_array[5],
    });
  }
  ctx.data_all_fields.sort(compare);
  ctx.max_winning_times = ctx.data_all_fields[0].nb_winning;

};

var updateData = function (svgMap) {
  // ctx.data_zero = ctx.data_original_zero;
  ctx.data_one = ctx.data_original_one;
  ctx.links = []

  // cumulative data with all fields
  cumulateData(ctx.data_original_one, ctx.YEAR);

  ctx.data_one = ctx.data_one.filter(function (d) {
    return d.Year === ctx.YEAR && ctx.catg.includes(d.Category) && ctx.sex.includes(d.Sex) && ctx.type.includes(d.LaureateType);
  });


  
  // for a selected year
  for (let i = 0; i < ctx.data_one.length; i++) {
    var c = ctx.country_centroid.filter(d => d.id === ctx.data_one[i].OrganizationCountry);
    var b = ctx.country_centroid.filter(d => d.id === ctx.data_one[i].BirthCountry);

    if (c.length != 0 && b.length != 0) {
      var space_between_nodes;
      if (ctx.data_one[i].OrganizationCountry === "United States") space_between_nodes = 20;
      else if (ctx.data_one[i].OrganizationCountry === "France") space_between_nodes = -5;
      else space_between_nodes = 3;
      var coords = [c[0].centroid[0] + space_between_nodes * Math.random(), c[0].centroid[1] + space_between_nodes * 2 * Math.random()];
      var birthcoords = [b[0].centroid[0], b[0].centroid[1]];
      ctx.winner.push({
        year: ctx.YEAR,
        fullname: ctx.data_one[i].FullName,
        category: ctx.data_one[i].Category,
        type: ctx.data_one[i].LaureateType,
        age: ctx.data_one[i].Age,
        country: ctx.data_one[i].OrganizationCountry,
        university: ctx.data_one[i].OrganizationName,
        birthcountry: ctx.data_one[i].BirthCountry,
        coords: coords,
        birthcoords: birthcoords
      })

      if (ctx.data_one[i].OrganizationCountry !== ctx.data_one[i].BirthCountry && ctx.data_one[i].OrganizationCountry != '' && ctx.data_one[i].BirthCountry != '') {
        ctx.links.push({
          source: birthcoords,
          target: coords
        })
      }

    }



  }

  list = [];
  ctx.countries_of_winners = [];
  // get the list of all countries winning the nobel prize and the number of winning
  for (let i = 0; i < ctx.data_one.length; i++) {
    var i_country = ctx.data_one[i]["OrganizationCountry"];
    var o_country = ctx.data_one[i]["BirthCountry"];
    if (i_country !== "") list.push(i_country);
    if (i_country === "" && o_country !== "") list.push(o_country);
    if (i_country !== "" && !ctx.countries_of_winners.includes(i_country)) {
      ctx.countries_of_winners.push(i_country);
    }
    if (
      i_country === "" &&
      o_country !== "" &&
      !ctx.countries_of_winners.includes(o_country)
    ) {
      ctx.countries_of_winners.push(o_country);
    }

  }


  // count the number of wins for each country
  for (var i = 0; i < ctx.countries_of_winners.length; i++) {
    var nb = countOccurrences(list, ctx.countries_of_winners[i]);
    ctx.countries_of_winners_winning_times.push([
      ctx.countries_of_winners[i],
      nb,
    ]);

  }
  for (var i = 0; i < ctx.data_original_zero.features.length; i++) {
    // Add nbv field ==> fill the map with winnig times color
    if (
      ctx.countries_of_winners_v_2.includes(ctx.data_original_zero.features[i].properties["name"])
    ) {
      var obj=ctx.data_all_fields.filter(d=>d.country===ctx.data_original_zero.features[i].properties["name"])[0];
      ctx.data_original_zero.features[i].properties["nbv"] =obj.nb_winning;
      
    } else {
      ctx.data_original_zero.features[i].properties["nbv"] = "0";
    }
  }


};



// ---------- map functions + slider
var makeMap = function (svgMap) {
  // bind and draw geographical features to <path> elements
  addCountries();
  svgMap.append("text")
            .attr("id","titlemap")
            // .attr("font-size", 13)
            .attr("font-weight", "bold")
            .text("The Nobel Laureates in "+ctx.YEAR)
            .attr("transform","translate(200,15)");
};

var addCountries = function () {
  // geo path
  var geoPathGen = d3.geoPath().projection(PROJECTIONS.ER);

  //bind features to path elements
  d3.select("g#map")
    .selectAll("path")
    .data(ctx.data_original_zero.features)
    .enter()
    .append("path")
    .attr("d", geoPathGen)
    .attr("class", "country")
    .style("fill", function (d) {
      return setColor(d.properties["nbv"]);
    })
    .on("mouseover", mouseOver)
    .on("click", mouseClick)
    .on("mousemove", mouseMove)
    .on("mouseleave", mouseLeave);

  // create a tooltip
  var Tooltip = d3.select("div#map")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "2px")
    .style("border-radius", "5px")
    .style("padding", "5px")

   // create origin tooltip
   var originTooltip = d3.select("div#map")
   .append("div")
   .attr("class", "origintooltip")
   .style("opacity", 0)
   .style("position", "absolute")
   .style("background-color", "white")
   .style("border", "solid")
   .style("border-width", "2px")
   .style("border-radius", "5px")
   .style("padding", "5px")


};

var SetNodesposition = function (svgMap) {
  // geo path
  var geoPathGen = d3.geoPath().projection(PROJECTIONS.ER);

  // compute geometry centroid
  for (let i = 0; i < ctx.data_original_zero.features.length; i++) {
    var d = ctx.data_original_zero.features[i];
    let coords = geoPathGen.centroid(d.geometry);
    ctx.country_centroid.push({
      id: d.properties.name,
      centroid: d.properties.name === "United States" ? [coords[0] + 10, coords[1] + 10] : coords,
    });
  }

 
};


var updateCountries = function (svgMap) {

  //d3.select("g#map").style("pointer-events", "none")
  // nodes representing winners
  d3.select("#nodes")
    .selectAll("circle")
    .data(ctx.winner)
    .join(
      enter => enter
        .append("circle")
        .attr('cx', (d) => { return d.coords[0]; })
        .attr('cy', (d) => { return d.coords[1]; })
        .attr("id", "winner-node")
        .attr("r", "3px")
        .attr("stroke", "black")
        .attr("fill", (d) => { return ctx.color_scale(d.category); }),

      update => update
        .attr('cx', (d) => { return d.coords[0]; })
        .attr('cy', (d) => { return d.coords[1]; })
        .attr("fill", (d) => { return ctx.color_scale(d.category); }),

      exit => exit
        .remove()

    ).on("mouseover", function (d, i) {
      updateInfo(i);
      d3.select(this).attr("r", "5px");
    }).on("mouseleave", function (d) {
      d3.select(this).attr("r", "3px");
    });

  d3.select("#origins")
    .selectAll("circle")
    .data(ctx.winner.filter((d) => d.country != d.birthcountry))
    .join(
      enter => enter
        .append("circle")
        .attr('cx', (d) => { return d.birthcoords[0]; })
        .attr('cy', (d) => { return d.birthcoords[1]; })
        .attr("r", "1px")
        .attr("stroke", "black"),

      update => update
        .attr('cx', (d) => {
          return d.birthcoords[0];
        })
        .attr('cy', (d) => {
          return d.birthcoords[1];
          ;
        }),

      exit => exit
        .remove()
    
    ).on("mouseover", mouseOverOrigin)
    .on("mousemove", mouseMoveOrigin)
    .on("mouseleave", mouseLeaveOrigin);


  d3.select("#links")
    .selectAll("path")
    .data(ctx.links)
    .join(
      enter => enter
        .append("path")
        .attr("id", "link")
        .attr('fill', 'none')
        .attr("stroke", "black")
        .attr("d", function (d) {
          var sum_pow = Math.pow((d.target[0] - d.source[0]), 2) + Math.pow((d.target[1] - d.source[1]), 2);
          var r = Math.sqrt(sum_pow) / (2 * Math.cos(Math.PI / 6));
          var a = Math.atan2((d.target[1] - d.source[1]), (d.target[0] - d.source[0]));
          var cpx = d.source[0] + r * Math.cos(a + Math.PI / 6);
          var cpy = d.source[1] + r * Math.sin(a + Math.PI / 6);
          return "M" + d.source[0] + "," + d.source[1] + " Q" + cpx + "," + cpy + " " + d.target[0] + "," + d.target[1];
        })
        .attr("opacity", 0.5)
        .on("mouseover", function (d) {
          d3.select(this).style("opacity", 0.9);
        }).on("mouseleave", function (d) {
          d3.select(this).style("opacity", 0.5);
        }),

      update => update
        .attr("d", function (d) {
          var sum_pow = Math.pow((d.target[0] - d.source[0]), 2) + Math.pow((d.target[1] - d.source[1]), 2);
          var r = Math.sqrt(sum_pow) / (2 * Math.cos(Math.PI / 6));
          var a = Math.atan2((d.target[1] - d.source[1]), (d.target[0] - d.source[0]));
          var cpx = d.source[0] + r * Math.cos(a + Math.PI / 6);
          var cpy = d.source[1] + r * Math.sin(a + Math.PI / 6);
          return "M" + d.source[0] + "," + d.source[1] + " Q" + cpx + "," + cpy + " " + d.target[0] + "," + d.target[1];
        }),

      exit => exit
        .remove()
    )

  // fill
  d3.select("g#map")
    .selectAll("path")
    .data(ctx.data_original_zero.features)
    .style("fill", function (d) {
      return setColor(d.properties["nbv"]);
    });


    // title
    d3.select("#titlemap")
      .text("Nobel Laureates in "+ctx.YEAR)

};

var updateInfo = function (winner) {

  let name=winner.fullname;
  let profile_link;
  
  var url = "https://en.wikipedia.org/w/api.php"; 

var params = {
    action: "query",
    format: "json",
    prop: "extracts|pageimages|revisions",
    titles: name,
    redirects: 1,
    formatversion: "2",
    exsentences: "2",
    exintro: 1,
    explaintext: 1,
    piprop: "thumbnail",
    pithumbsize: "300",
    rvprop: "timestamp"
  
};

url = url + "?origin=*";
Object.keys(params).forEach(function(key){url += "&" + key + "=" + params[key];});

fetch(
url,  {
    method: "GET"
  }
)
  .then(response => response.json())
  .then(json => {
    // console.log(json.query.pages[0].thumbnail.source)
    d3.select("img#profile").attr("src", json.query.pages[0].thumbnail.source)
  })
  .catch(error => {
    console.log(error.message);
  });


  d3.select("div#infonobel").remove()
  d3.select("div#infowinner").style("visibility", "visible")

  // d3.select("img#profile").attr("src", profile_link)
  d3.select("label#name").text(winner.fullname);
  d3.select("label#catg").text(winner.category);
  d3.select("label#age").text(winner.age);
  d3.select("label#univ").text(winner.university);
  d3.select("label#count").text(winner.country);
  d3.select("label#birthcount").text(winner.birthcountry);
  d3.select("label#year").text(ctx.YEAR);

}
var makeControllers = function () {
  // year
  var dataTime = d3.range(0, 116).map(function (d) {
    return new Date(1901 + d, 1, 3);
  });

  let sliderYear = [
    new Date(1901, 1, 1),
    new Date(2016, 1, 1),
  ];

  var sliderTime = d3
    .sliderVertical()
    .min(d3.min(dataTime))
    .max(d3.max(dataTime))
    .step(1000 * 60 * 60 * 24 * 365)
    .height(150)
    .tickFormat(d3.timeFormat("%Y"))
    .tickValues(sliderYear)
    .default(new Date(2016, 1, 1))
    .on("onchange", (val) => {
      ctx.YEAR = d3.timeFormat("%Y")(val); // get the year selected
      updateData();
      updateCountries();
      updateChart();
      //update Charts
      d3.select("text.slider-value").text(d3.timeFormat("%Y")(val));
    });

  var gTime = d3
    .select("svg#slider-time")
    .attr("width", 100)
    .attr("height", 230)
    .append("g")
    .attr("transform", "translate(70,30)");

  gTime.call(sliderTime);


  var gText = d3
    .select("svg#slider-time")
    .append("text")
    .attr("class", "slider-value")
    .attr("width", 40)
    .attr("height", 20)
    .text(d3.timeFormat("%Y")(sliderTime.value()))
    .attr("transform", "translate(50,220)");

  // Category
  d3.select("#Chemistry").on("change", function () { updateCategroy("Chemistry") });
  d3.select("#Literature").on("change", function () { updateCategroy("Literature") });
  d3.select("#Medicine").on("change", function () { updateCategroy("Medicine") });
  d3.select("#Peace").on("change", function () { updateCategroy("Peace") });
  d3.select("#Physics").on("change", function () { updateCategroy("Physics") });
  d3.select("#Economics").on("change", function () { updateCategroy("Economics") });

  // Sex
  d3.select("#Male").on("change", function () { updateSex("Male") });
  d3.select("#Female").on("change", function () { updateSex("Female") });

  // Laureate type
  d3.select("#Individual").on("change", function () { updateType("Individual") });
  d3.select("#Organization").on("change", function () { updateType("Organization") });
}

// update functions for controllers
var updateCategroy = function (cat) {

  if (d3.select("#" + cat).property("checked")) {
    if (!ctx.catg.includes(cat)) ctx.catg.push(cat);
  } else {
    ctx.catg = ctx.catg.filter(e => e != cat);
  }
  updateData();
  updateChart();
  updateCountries();
  createAgeLineChart();
}
var updateSex = function (sex) {

  if (d3.select("#" + sex).property("checked")) {
    if (!ctx.sex.includes(sex)) ctx.sex.push(sex);
    console.log(ctx.sex);
  } else {
    ctx.sex = ctx.sex.filter(e => e != sex);
    console.log(ctx.sex);
  }
  updateData();
  updateChart();
  updateCountries();

}
var updateType = function (type) {

  if (d3.select("#" + type).property("checked")) {
    if (!ctx.type.includes(type)) ctx.type.push(type);
    console.log(ctx.type);
  } else {
    ctx.type = ctx.type.filter(e => e != type);
    console.log(ctx.type);
  }
  updateData();
  updateChart();
  updateCountries();
}

// chart ( countries + category )
var makeChart = function (svgChart) {
  // Add X axis
  var x = d3.scaleLinear().domain([0, ctx.max_winning_times]).range([0, CHART_W - 200]);
  svgChart.append("g").attr("id", "xaxis").attr("transform", `translate(${100},${MAP_H - 50} )`).call(d3.axisBottom(x).tickSizeOuter(0));

  // Add Y axis
  var countries = [];
  for (var i = 0; i < 10; i++) {
    countries.push(ctx.data_all_fields[i].country);
  }

  var y = d3.scaleBand().domain(countries.reverse()).range([300, 0]).padding([0.2]);
  svgChart.append("g").attr("id", "yaxis").attr("transform", `translate(${100},${50})`).call(d3.axisLeft(y));



  // stacked data
  var stackedData = d3.stack().keys(ctx.catg)(ctx.data_all_fields.slice(0, 10));


  // Show the bars
  svgChart
    .append("g")
    .selectAll("g")
    .data(stackedData)
    .enter()
    .append("g")
    .attr("fill", function (d, i) { return ctx.color_scale(d.key); })
    .selectAll("rect")
    .data(function (d) { return d; })
    .enter()
    .append("rect")
    .attr("x", function (d) { return x(d[0]); })
    .attr("y", function (d) { return y(d.data.country); })
    .attr("width", function (d) { return x(d[1]) - x(d[0]); })
    .attr("height", y.bandwidth())
    .attr("transform", `translate(${100},${50})`);





  var labels = svgChart
    .append("g")
    .attr("id", "label")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("text-anchor", "end")
    .selectAll("text")
    .data(ctx.data_all_fields.slice(0, 10))
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("x", function (d) { return x(d.nb_winning); })
    .attr("y", function (d) { return y(d.country); })
    .text(function (d) { return d.nb_winning })
    .attr("transform", `translate(${120},${65})`);

  // Legend
  var legend = svgChart
    .append("g")
    .attr("id", "legend")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("text-anchor", "end")
    .selectAll("g")
    .data(ctx.catg)
    .enter()
    .append("g")
    .attr("transform", function (d, i) {
      return "translate(-10," + (100 + i * 20) + ")";
    });

  legend
    .append("rect")
    .attr("x", CHART_W - 19)
    .attr("width", 19)
    .attr("height", 19)
    .attr("fill", (d, i) => ctx.color_scale(d));

  legend
    .append("text")
    .attr("x", CHART_W - 24)
    .attr("y", 9.5)
    .attr("dy", "0.32em")
    .text(function (d) {
      return d;
    });

    svgChart.append("text")
            .attr("id","titlechart")
            // .attr("font-size", 13)
            .attr("font-weight", "bold")
            .text("Top ten countries with the most Nobel Prize winners between 1901 and "+ctx.YEAR)
            .attr("transform","translate(130,30)");

    svgChart.append("text")
            .attr("font-family", "sans-serif")
            .attr("font-size", 12)
            .text("Number of awards")
            .attr("transform","translate(300,380)");
            
};

var updateChart = function () {

  // update x axis
  var x = d3.scaleLinear().domain([0, ctx.max_winning_times]).range([0, CHART_W - 200]);
  d3.select("#xaxis").remove();
  d3.select("#StackBachChart").append("g").attr("id", "xaxis").attr("transform", `translate(${100},${MAP_H - 50} )`).call(d3.axisBottom(x).tickSizeOuter(0));

  // // update y axis
  var countries = [];
  for (var i = 0; i < 10; i++) {
    countries.push(ctx.data_all_fields[i].country);
  }

  var y = d3.scaleBand().domain(countries.reverse()).range([300, 0]).padding([0.2]);
  d3.select("#yaxis").remove();
  d3.select("#StackBachChart").append("g").attr("id", "yaxis").attr("transform", `translate(${100},${50})`).call(d3.axisLeft(y));

  // stacked data
  var stackedData = d3.stack().keys(ctx.catg)(ctx.data_all_fields.slice(0, 10));

  // update Stack Bar
  d3.select("#StackBachChart")
    .select('g')
    .selectAll("g")
    .data(stackedData)
    .join(
      enter => enter
        .append("g")
        .attr("fill", (d, i) => { return ctx.color_scale(d.key) }),

      update => update
        .attr("fill", (d, i) => { return ctx.color_scale(d.key) }),
      exit => {
        exit
          .remove();
      }
    ).selectAll("rect")
    .data(function (d) { return d; })
    .join(
      enter => enter
        .append("rect")
        .attr("x", function (d) { return x(d[0]); })
        .attr("y", function (d) { return y(d.data.country); })
        .attr("width", function (d) { return x(d[1]) - x(d[0]); })
        .attr("height", y.bandwidth())
        .attr("transform", `translate(${100},${50})`),

      update => update
        .transition()
        .duration(ctx.TRANSITION_DURATION / 2)
        .attr("x", function (d) { return x(d[0]); })
        .attr("y", function (d) { return y(d.data.country); })
        .attr("width", function (d) { return x(d[1]) - x(d[0]); })
        .attr("height", y.bandwidth())
        .attr("transform", `translate(${100},${50})`),

      exit => exit
        .remove()
    );


  // update title
  d3.select("#titlechart")
    .text("The ten countries with the most Nobel Prize winners between 1901 and "+ctx.YEAR)

  // update labels
  d3.select("g#label")
    .selectAll("text")
    .data(ctx.data_all_fields.slice(0, 10))
    .transition()
    .duration(ctx.TRANSITION_DURATION / 2)
    .attr("x", function (d) { return x(d.nb_winning); })
    .attr("y", function (d) { return y(d.country); })
    .text(function (d) { return d.nb_winning });


  // update legend
  d3.select("#StackBachChart").select("#legend").remove();
  var legend = d3.select("#StackBachChart")
    .append("g")
    .attr("id", "legend")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("text-anchor", "end")
    .selectAll("g")
    .data(ctx.catg)
    .enter()
    .append("g")
    .attr("transform", function (d, i) {
      return "translate(-10," + (100 + i * 20) + ")";
    });

  legend
    .append("rect")
    .attr("x", CHART_W - 19)
    .attr("width", 19)
    .attr("height", 19)
    .attr("fill", (d, i) => ctx.color_scale(d));

  legend
    .append("text")
    .attr("x", CHART_W - 24)
    .attr("y", 9.5)
    .attr("dy", "0.32em")
    .text(function (d) {
      return d;
    });



}


// ---------------  annexe functions
function compare(a, b) {
  if (a.nb_winning < b.nb_winning) {
    return 1;
  }
  if (a.nb_winning > b.nb_winning) {
    return -1;
  }
  return 0;
}

var setColor = function (nbv) {

  if (nbv == "0") return "#ccc";
  return "#A8C8C8";
  
};

// function taken from https://www.w3resource.com/javascript-exercises/fundamental/javascript-fundamental-exercise-70.php
const countOccurrences = (arr, val) =>
  arr.reduce((a, v) => (v === val ? a + 1 : a), 0);

// function taken from https://www.folkstalk.com/2022/09/javascript-create-array-from-1-to-n-with-code-examples.html
var range = function (start, end) {
  return Array(end - start + 1)
    .fill()
    .map((_, idx) => start + idx);
};


let mouseOver = function (d) {
  d3.selectAll(".Country")
    .transition()
    .duration(200)
    .style("opacity", .5)
  d3.select(this)
    .transition()
    .duration(200)
    .style("opacity", 1)
    .style("stroke", "black")
  d3.select(".tooltip").style("opacity", 1)
}
let mouseClick = function (event,d) {
 ctx.selected_coutry=d.properties['name'];
 createUnivBarChart();
}


let mouseMove = function (event, d) {
 
  d3.select(".tooltip")
    .html("Country: "+d.properties["name"] + "<br>" + "nb_prize_to "+ctx.YEAR+": " + d.properties["nbv"])
    .style("left", (event.offsetX + 10) + "px")
    .style("top", (event.offsetY + MAP_H - 100) + "px")
}

let mouseLeave = function (d) {
  d3.selectAll(".Country")
    .transition()
    .duration(200)
    .style("opacity", .8)
  d3.select(this)
    .transition()
    .duration(200)
    .style("stroke", "transparent")
  d3.select(".tooltip").style("opacity", 0)
}

let mouseOverOrigin = function (d) {
  d3.select(".origintooltip").style("opacity", 1)
}

let mouseMoveOrigin = function (event, d) {
  d3.select(".origintooltip")
    .html(d.birthcountry)
    .style("left", (event.offsetX + 10) + "px")
    .style("top", (event.offsetY + MAP_H - 100) + "px")
}

let mouseLeaveOrigin = function (d) {
  d3.select(".origintooltip").style("opacity", 0)
}


// vegalite chart
var createAgeLineChart = function () {

  vlSpec = {
      "title":"Evolution of the age of the laureates over the years",
      "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
      "description": "Age evolution over years and category",
      "data": { 
        url:'./data/csv_nobel-prize-2016.csv'
      },
      "transform": [
        {"filter": {"field": "Category", "oneOf": ctx.catg} }],
      "mark": "line",
      "encoding": {
        "x": {"field": "Year", "type": "temporal"},
        "y": { "aggregate":"average","field": "Age", "type": "quantitative","scale": { "domain": [25,90] }},
        "color": {"field": "Category", "type": "nominal"}
      },
      "layer": [{
        "mark": "line"
      }, {
        "params": [{
          "name": "hover",
          "select": {"type": "point", "on": "mouseover", "clear": "mouseout"}
        }],
        "mark": {"type": "circle", "tooltip": true},
        "encoding": {
          "opacity": {
            "condition": {"test": {"param": "hover", "empty": false}, "value": 1},
            "value": 0
          },
          "size": {
            "condition": {"test": {"param": "hover", "empty": false}, "value": 48},
            "value": 100
          }
        }
      }]
      
      
  };
  vlOpts = { width: 500, height: 200, actions: false };
  
  return vegaEmbed('#vegalineChart', vlSpec, vlOpts);
};


var createUnivBarChart = function(){
  vlSpec = {
    "title": "Top univerties in "+ctx.selected_coutry,
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "description": "Universities Palmarès",
    "data": { 
      url:'./data/csv_nobel-prize-2016.csv'
    },
    "transform": [
       {"filter": {"field": "OrganizationCountry", "equal": ctx.selected_coutry} },
      {"window": [{
        "op": "count",
        "field":"OrganizationName",
        "as": "number"
      }]},
      {
        "window": [{
          "op": "rank",
          "as": "rank"
        }],
        "sort": [{ "field": "number", "order": "ascending" }]
      }, {
        "filter": "datum.rank <= 10"
      }
    ],
    "mark": "bar",
    "encoding": {
      "y": {"field": "OrganizationName", "type": "nominal","sort": "-x",  "title":"University"},
      "x": { "field": "number", "type": "quantitative","title":"Number of prize"},
    },
    resolve: {scale: {x: "independent"}}
    
    
};
vlOpts = { width: 300, height: 300, actions: false };

return vegaEmbed('#vegabarChart', vlSpec, vlOpts);
}