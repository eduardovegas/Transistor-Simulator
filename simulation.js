const CHART_COLORS = {
    red: 'rgb(255, 99, 132)',
    orange: 'rgb(255, 159, 64)',
    yellow: 'rgb(255, 205, 86)',
    green: 'rgb(75, 192, 192)',
    blue: 'rgb(54, 162, 235)',
    purple: 'rgb(153, 102, 255)',
    grey: 'rgb(201, 203, 207)',
    black: 'rgb(101, 103, 107)'
};

var curve_chart;
var load_chart;

function isapprox(a, b)
{
    rtol = 0.01; // within 1% difference
    atol = 0.0005; // less than 0.5 milli unit
    if(a == 0)
    {
        return Math.abs(b) <= atol;
    }
    if(b == 0)
    {
        return Math.abs(a) <= atol;
    }
    return Math.abs(a - b) <= rtol * Math.max(a, b);
}

function mean_strings(a, b)
{
    a2 = parseFloat(a);
    b2 = parseFloat(b);
    var mean = (a2+b2)/2.0;
    var floor = Math.floor(mean);
    if(a < floor || b < floor)
    {
        return floor;
    }
    return Math.ceil(mean);
}

function simulate(Vb, Vc, Rb, Rc, β, Vhup)
{
    var region = "Região Ativa";
    var Ic_max = Vc/Rc;
    var Vce_max = Vc;

    var Ib = (Vb-0.7)/Rb;
    var Ic = β*Ib;

    if(Ic > Ic_max)
    {
        Ic = Ic_max;
    }

    var Vce = Vc - Rc*Ic;

    if(Vce < 0)
    {
        Vce = 0.0;
    }

    Ib = parseFloat(Ib.toFixed(8));
    Ic = parseFloat(Ic.toFixed(8));
    Ic_max = parseFloat(Ic_max.toFixed(8));

    if(isapprox(Ic, Ic_max) || isapprox(Vce, 0))
    {
        region = "Região de Saturação";
    }

    if(isapprox(Ic, 0) || isapprox(Vce, Vce_max))
    {
        region = "Região de Corte";
    }

    if(Vce >= Vhup)
    {
        Ic = Ic_max;
        region = "Região de Ruptura";
    }

    Ib *= 1000.0;
    Ic *= 1000.0;
    Ic_max *= 1000.0;
    var simulation = {
        Ib: Ib,
        Ic: Ic,
        Vce: Vce,
        region: region,
        load_line: {
            Ic_max: Ic_max,
            Vce_max:Vce_max
        }
    }
    return simulation;
}

function get_charts_data(Vb, Rb, Rc, β, Vhup, load_line)
{
    var ini_step = 0.10;
    var Vces = [];
    var Ics = [];
    var regions = [];
    var prev_Vce = "-1";
    var Vc = 0
    for (Vc = 0; Vc >= 0; Vc += ini_step)
    {
        var simulation = simulate(Vb, Vc, Rb, Rc, β, Vhup);
        if(simulation.region != "Região de Saturação" || simulation.region != "Região de Corte")
        {
            break;
        }

        var Vce = simulation.Vce.toFixed(5);
        var Ic = simulation.Ic.toFixed(5);
        if(prev_Vce != Vce)
        {
            prev_Vce = Vce;
            Vces.push(Vce);
            Ics.push(Ic);
            regions.push(simulation.region);
        }
    }

    var step = 2;
    for (; Vc >= 0; Vc += step)
    {
        var simulation = simulate(Vb, Vc, Rb, Rc, β, Vhup);
        if(simulation.region == "Região de Ruptura")
        {
            break;
        }

        var Vce = simulation.Vce.toFixed(5);
        var Ic = simulation.Ic.toFixed(5);
        if(prev_Vce != Vce)
        {
            prev_Vce = Vce;
            Vces.push(Vce);
            Ics.push(Ic);
            regions.push(simulation.region);
        }
    }

    for(var v = Vc-step+ini_step; v < Vc; v += ini_step)
    {
        var simulation = simulate(Vb, Vc, Rb, Rc, β, Vhup);
        var Vce = simulation.Vce.toFixed(5);
        var Ic = simulation.Ic.toFixed(5);
        if(prev_Vce != Vce)
        {
            prev_Vce = Vce;
            Vces.push(Vce);
            Ics.push(Ic);
            regions.push(simulation.region);
        }
    }

    var b = load_line.Ic_max;
    var a = -(b)/(load_line.Vce_max);
    var Vs = [];
    var Is = [];
    step = load_line.Vce_max/20.0;
    for(var v = 0; v < load_line.Vce_max+(step/2.0); v += step)
    {
        var i = (a*v + b);
        if(v == 0)
        {
            Vs.push(0);
        }
        else
        {
            Vs.push(v.toFixed(2));
        }
        if(isapprox(i, 0))
        {
            Is.push(0);
            break;
        }
        else
        {
            Is.push((a*v + b).toFixed(3));
        }
    }

    curve_data = {
        Vces,
        Ics,
        regions
    };
    load_data = {
        Vs,
        Is
    };
    return {curve_data, load_data};
}

function plot(curve_data, load_data)
{
    curve_chart = new Chart(
        "Curva",
        {
            type: "line",
            data: {
                labels: curve_data.Vces,
                datasets: [
                    {
                        label: "Ic",
                        fill: false,
                        pointRadius: 0,
                        borderColor: CHART_COLORS.blue,
                        segment: {
                            borderColor: function(segment) {
                                var region_p0 = curve_data.regions[segment.p0DataIndex];
                                var region_p1 = curve_data.regions[segment.p1DataIndex];
                                if(region_p0 == "Região de Corte" && region_p1 == "Região de Corte")
                                {
                                    return CHART_COLORS.black;
                                }
                                if(region_p0 == "Região de Saturação" || (region_p0 == "Região de Corte" && region_p1 == "Região de Saturação") || (region_p0 == "Região de Corte" && region_p1 == "Região Ativa"))
                                {
                                    return CHART_COLORS.purple;
                                }
                                return CHART_COLORS.blue;
                            }
                        },
                        data: curve_data.Ics,
                        cubicInterpolationMode: 'monotone',
                    }
                ],
            },
            options: {
                responsive: true,
                legend: {
                    display: true
                },
                interaction: {
                    intersect: false,
                    mode: 'nearest',
                    axis: 'x'
                },
                scales: {
                    y: {
                        max: (mean_strings(curve_data.Ics[curve_data.Ics.length-1], curve_data.Ics[curve_data.Ics.length-2]))
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: "Curva do transistor"
                    },
                    tooltip: {
                        callbacks: {
                            title: function(TooltipItems) {
                                return "Vce: " + TooltipItems[0].label + " V"
                            },
                            label: function(TooltipItem) {
                                var dataset = TooltipItem.dataset;
                                var index = TooltipItem.dataIndex;
                                return dataset.label + ": " + dataset.data[index] + " mA";
                            },
                            footer: function(TooltipItems) {
                                return curve_data.regions[TooltipItems[0].dataIndex];
                            }
                        }
                    }
                }
            }
        }
    );

    load_chart = new Chart(
        "Reta",
        {
            type: "line",
            data: {
                labels: load_data.Vs,
                datasets: [
                    {
                        label: "Ic",
                        fill: false,
                        pointRadius: 0,
                        borderColor: CHART_COLORS.red,
                        data: load_data.Is,
                        tension: 0
                    }
                ],
            },
            options: {
                responsive: true,
                legend: {
                    display: true
                },
                interaction: {
                    intersect: false,
                    mode: 'nearest',
                    axis: 'x'
                },
                scales: {
                    y: {
                        max: parseFloat(load_data.Is[0])
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: "Reta de carga"
                    },
                    tooltip: {
                        callbacks: {
                            title: function(TooltipItems) {
                                return "Vce: " + TooltipItems[0].label + " V"
                            },
                            label: function(TooltipItem) {
                                var dataset = TooltipItem.dataset;
                                var index = TooltipItem.dataIndex;
                                return dataset.label + ": " + dataset.data[index] + " mA";
                            }
                        }
                    }
                }
            }
        }
    );
}

function update(curve_data, load_data)
{
    curve_chart.data.labels = curve_data.Vces;
    curve_chart.data.datasets[0].data = curve_data.Ics;
    curve_chart.data.datasets[0].segment.borderColor = function(segment) {
        var region_p0 = curve_data.regions[segment.p0DataIndex];
        var region_p1 = curve_data.regions[segment.p1DataIndex];
        if(region_p0 == "Região de Corte" && region_p1 == "Região de Corte")
        {
            return CHART_COLORS.black;
        }
        if(region_p0 == "Região de Saturação" || (region_p0 == "Região de Corte" && region_p1 == "Região de Saturação") || (region_p0 == "Região de Corte" && region_p1 == "Região Ativa"))
        {
            return CHART_COLORS.purple;
        }
        return CHART_COLORS.blue;
    }
    curve_chart.options.scales.y.max = (mean_strings(curve_data.Ics[curve_data.Ics.length-1], curve_data.Ics[curve_data.Ics.length-2]));
    curve_chart.options.plugins.tooltip.callbacks.footer = function(TooltipItems) {
        return curve_data.regions[TooltipItems[0].dataIndex];
    };
    curve_chart.update();

    load_chart.data.labels = load_data.Vs;
    load_chart.data.datasets[0].data = load_data.Is;
    load_chart.options.scales.y.max = parseFloat(load_data.Is[0]);
    load_chart.update();
}

function create_divs(simulation)
{
    var cur_div = document.getElementById("resultsText");
    var new_div = document.createElement("div");
    new_div.setAttribute("class", "boxLine4");
    new_div.setAttribute("id", "Ib");
    new_div.appendChild(document.createTextNode("Ib: " + simulation.Ib.toFixed(3) + " mA"));
    document.body.insertBefore(new_div, cur_div);

    new_div = document.createElement("div");
    new_div.setAttribute("class", "boxLine4");
    new_div.setAttribute("id", "Ic");
    new_div.appendChild(document.createTextNode("Ic: " + simulation.Ic.toFixed(3) + " mA"));
    document.body.insertBefore(new_div, cur_div);

    new_div = document.createElement("div");
    new_div.setAttribute("class", "boxLine4");
    new_div.setAttribute("id", "Vce");
    new_div.appendChild(document.createTextNode("Vce: " + simulation.Vce.toFixed(2) + " V")); 
    document.body.insertBefore(new_div, cur_div);

    new_div = document.createElement("div");
    new_div.setAttribute("class", "boxLine4");
    new_div.setAttribute("id", "region");
    new_div.appendChild(document.createTextNode(simulation.region));
    document.body.insertBefore(new_div, cur_div);


    var cur_div = document.getElementById("null");
    var new_div = document.createElement("div");
    new_div.setAttribute("class", "chartCard");
    document.body.insertBefore(new_div, cur_div);

    var canvas = document.createElement("canvas");
    canvas.id = "Curva";
    canvas.setAttribute("class", "chartBox");
    new_div.appendChild(canvas);

    var canvas = document.createElement("canvas");
    canvas.id = "Reta";
    canvas.setAttribute("class", "chartBox");
    new_div.appendChild(canvas);
}

function update_divs(simulation)
{
    document.getElementById("Ib").childNodes[0].nodeValue = "Ib: " + simulation.Ib.toFixed(3) + " mA";
    document.getElementById("Ic").childNodes[0].nodeValue = "Ic: " + simulation.Ic.toFixed(3) + " mA";
    document.getElementById("Vce").childNodes[0].nodeValue = "Vce: " + simulation.Vce.toFixed(2) + " V";
    document.getElementById("region").childNodes[0].nodeValue = simulation.region;
}

function button()
{
    var Vb = parseFloat(document.getElementById("Vb").value);
    var Vc = parseFloat(document.getElementById("Vc").value);
    var Rb = parseFloat(document.getElementById("Rb").value);
    var Rc = parseFloat(document.getElementById("Rc").value);
    var β = parseFloat(document.getElementById("β").value);
    var Vhup = parseFloat(document.getElementById("Vhup").value);
    if(isNaN(Vb) || isNaN(Vc) || isNaN(Rb) || isNaN(Rc) || isNaN(β) || isNaN(Vhup))
    {
        return;
    }

    var simulation = simulate(Vb, Vc, Rb, Rc, β, Vhup);
    var charts_data = get_charts_data(Vb, Rb, Rc, β, Vhup, simulation.load_line);

    if(document.getElementById("Ib") == null) // create new divs
    {
        create_divs(simulation);
        plot(charts_data.curve_data, charts_data.load_data);
    }
    else // update divs
    {
        update_divs(simulation);
        update(charts_data.curve_data, charts_data.load_data);
    }
}
