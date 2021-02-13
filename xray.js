//EDUCATIONAL SAMPLE!!! DO NOT USE IN PRODUCTION!!!
//copy below code to vanilla postload.js or custom PL

//re-visiting the applet x-ray in Siebel 20/21
//Alexander Hansal, blacksheep IT consulting
/*
2021-01-03: fixed GetEl issue
2021-02-13: merged with devpops
*/

//we use postload, which is primitive but this is just a demo, so get over it... (talking to myself)
BCRMPostload = function () {
    try {
        //var vn = SiebelApp.S_App.GetActiveView().GetName();
        var am = SiebelApp.S_App.GetActiveView().GetAppletMap();
        var ut = new SiebelAppFacade.BCRMUtils();
        //main loop, all applets
        for (a in am) {
            //xray handler
            ut.AddXrayHandler(a);
        }
    }
    catch (e) {
        console.log("Error in BCRMPostload: " + e.toString());
    }
};
SiebelApp.EventManager.addListner("postload", BCRMPostload, this);
//end of postload declaration

//everything below this line should go into a separate utility file
var BCRCMETACACHE = {};
if (typeof (SiebelAppFacade.BCRMUtils) === "undefined") {
    SiebelJS.Namespace("SiebelAppFacade.BCRMUtils");

    SiebelAppFacade.BCRMUtils = (function () {
        function BCRMUtils(options) { }

        //xray handler: defines trigger event
        BCRMUtils.prototype.AddXrayHandler = function (context) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var pm = ut.ValidateContext(context);
            var tp = "";
            var ae;
            if (pm) {
                tp = ut.GetAppletType(pm);
                if (tp == "form" || tp == "list") {
                    if (pm.Get("BCRM_XRAY_HANDLER_ENABLED") != "true") {
                        ae = ut.GetAppletElem(pm);
                        ae.dblclick(function () //jQuery double-click event handler
                        {
                            var cycle; //the toggle cycle
                            switch (pm.Get("C_ToggleCycle")) {
                                case "ShowControls": cycle = "ShowBCFields";
                                    break;
                                case "ShowBCFields": cycle = "ShowTableColumns";
                                    break;
                                case "ShowTableColumns": cycle = "Reset";
                                    break;
                                case "Reset": cycle = "ShowControls";
                                    break;
                                default: cycle = "ShowControls";
                                    break;
                            }
                            pm.SetProperty("C_ToggleCycle", cycle); //set property to current cycle
                            ut.ToggleLabels(cycle, pm); //call utility method
                            //console.log(cycle);
                        });
                        //console.log("BCRM XRay double-click handler enabled on: " + pm.GetObjName());
                        pm.SetProperty("BCRM_XRAY_HANDLER_ENABLED", "true");
                    }
                }

            }
        };

        //toggle labels main function
        BCRMUtils.prototype.ToggleLabels = function (cycle, context) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var pm = ut.ValidateContext(context);
            if (pm) {
                switch (cycle) //determine current toggle cycle and spawn functions
                {
                    case "ShowControls": ut.ShowControls(pm);
                        break;
                    case "ShowBCFields": ut.ShowBCFields(pm);
                        break;
                    //only simple physical metatdata as of yet,
                    case "ShowTableColumns": ut.ShowTableColumns(pm);
                        break;
                    case "Reset": ut.LabelReset(pm);
                        break;
                    default: ut.ShowBCFields(pm);
                        break;
                }
            }
        };

        //reset to original labels
        BCRMUtils.prototype.LabelReset = function (context) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var pm = ut.ValidateContext(context);
            var tp, cs, le;
            if (pm) {
                tp = ut.GetAppletType(pm);
                if (tp == "form" || tp == "list") {
                    cs = pm.Get("GetControls");
                    for (c in cs) {
                        if (cs.hasOwnProperty(c)) {
                            le = ut.GetLabelElem(cs[c], pm);
                            //look for "custom" labels
                            if (le && le.attr("bcrm-custom-label") == "true") {
                                ut.SetLabel(cs[c], cs[c].GetDisplayName(), pm);
                            }
                        }
                    }
                }
            }
        };

        //set label for a control
        BCRMUtils.prototype.SetLabel = function (c, nl, context) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var pm = ut.ValidateContext(context);
            var le;
            if (pm) {
                le = ut.GetLabelElem(c, pm);
                if (le) {
                    le.html(nl);
                    le.attr("title", nl);
                    //mark label as changed
                    le.attr("bcrm-custom-label", "true");
                }
            }
        };

        //get label element for a control
        BCRMUtils.prototype.GetLabelElem = function (c, context) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var pm = ut.ValidateContext(context);
            var tp;
            var pr, ce, li, ae, inpname, gh, ph, ch, cm, fn, cn, uit;
            var thelabel;
            var retval = null;
            if (pm) {
                tp = ut.GetAppletType(pm);
                pr = pm.GetRenderer();
                ae = ut.GetAppletElem(pm);
                uit = c.GetUIType();
                inpname = c.GetInputName();
                if (tp == "form" && pr.GetUIWrapper(c)) {
                    //get control element
                    ce = pr.GetUIWrapper(c).GetEl();
                    //first attempt: get by label id
                    li = $(ce).attr("aria-labelledby");

                    //first attempt
                    //20.10 or higher have applet id appended to label
                    //use "begins with" logic seems to do the trick
                    //needs more testing
                    thelabel = ae.find("span[id^='" + li + "']");

                    //alternative:re-create label id using applet id

                    //second attempt: try with text
                    if (thelabel.length == 0) {
                        li = $(ce).attr("aria-label");
                        ae.find("span:contains('" + li + "')").each(function (x) {
                            if ($(this).text() == li) {
                                thelabel = $(this);
                            }
                        })
                    }

                    //third attempt: use tag from previous runs
                    if (thelabel.length == 0) {
                        li = inpname;
                        thelabel = ae.find("[bcrm-label-for='" + li + "']");
                    }

                    if (uit == "Button") {
                        thelabel = ae.find("[name='" + inpname + "']");
                    }

                    //check if label has been found
                    if (thelabel.length == 1) {
                        //tag the label
                        thelabel.attr("bcrm-label-for", inpname);
                        retval = thelabel;
                    }
                }
                if (tp == "list" && typeof (c) !== "undefined") {
                    try {
                        gh = ae.find("table.ui-jqgrid-htable");
                        ph = pm.Get("GetPlaceholder");
                        ch = pr.GetColumnHelper();
                        cm = ch.GetColMap();
                        fn = c.GetName();
                        for (col in cm) {
                            if (cm[col] == fn) {
                                cn = col;
                            }
                        }
                        li = "div#jqgh_" + ph + "_" + cn;
                        thelabel = gh.find(li);

                        if (uit == "Button") {
                            thelabel = ae.find("[name='" + inpname + "']");
                        }

                        if (thelabel.length == 1) {
                            retval = thelabel;
                        }
                    }
                    catch (e) {
                        console.log("Error in GetLabelElem for applet: " + pm.GetObjName() + " : " + e.toString());
                    }
                }
                return retval;
            }
        }
        //show BC Field information on labels
        BCRMUtils.prototype.ShowBCFields = function (context) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var pm = ut.ValidateContext(context);
            var bc, fm, cs, tp, fn, fd;
            var fdt, fln, fcl, frq;
            var nl;
            if (pm) {
                bc = pm.Get("GetBusComp");
                fm = bc.GetFieldMap();
                tp = ut.GetAppletType(pm);
                //Form Applet treatment
                if (tp == "form" || tp == "list") {
                    cs = pm.Get("GetControls");
                    for (c in cs) {
                        if (cs.hasOwnProperty(c)) {
                            fn = cs[c].GetFieldName();
                            if (fn != "") {
                                fd = fm[fn];
                                fdt = fd.GetDataType(); //get the data type (text, bool, etc)
                                fln = fd.GetLength(); //get the field length (30, 100, etc)
                                frq = fd.IsRequired() ? "*" : ""; //get an asterisk when field is required, otherwise nothing
                                fcl = fd.IsCalc() ? "C" : ""; //get a "C" when field is calculated, otherwise nothing
                                nl = fn + " (" + fdt + "/" + fln + ")" + frq + fcl;
                                ut.SetLabel(cs[c], nl, pm);
                            }
                        }
                    }
                }
            }
        }

        //Wrapper for BCRM RR Reader service
        BCRMUtils.prototype.GetRRData = function (ot, on) {
            var svc = SiebelApp.S_App.GetService("BCRM RR Reader");
            var ips = SiebelApp.S_App.NewPropertySet();
            var ops;
            var data;
            ips.SetProperty("Object Type", ot);
            ips.SetProperty("Object Name", on);
            ops = svc.InvokeMethod("GetRRData", ips);
            if (ops.GetProperty("Status") == "OK") {
                data = ops.GetChildByType("ResultSet");
            }
            return data;
        };

        //extract specified data (BC only as of now, but could expand)
        BCRMUtils.prototype.ExtractBCData = function (rrdata) {
            var retval = {};
            var bc;
            var props;
            var pc;
            var cc;
            var fn;
            retval["Business Component"] = {};
            bc = retval["Business Component"];
            props = rrdata.GetChild(0).GetChildByType("Properties").propArray;
            pc = props.length;
            for (p in props) {
                bc[p] = props[p];
            }
            bc["Fields"] = {};
            bc["Joins"] = {};
            bc["Multi Value Links"] = {};
            cc = rrdata.GetChild(0).childArray;
            for (c in cc) {
                if (cc[c].type == "Field") {
                    props = cc[c].GetChildByType("Properties").propArray;
                    fn = cc[c].GetChildByType("Properties").propArray["Name"];
                    bc["Fields"][fn] = {};
                    for (p in props) {
                        bc["Fields"][fn][p] = props[p];
                    }
                }
                if (cc[c].type == "Join") {
                    props = cc[c].GetChildByType("Properties").propArray;
                    fn = cc[c].GetChildByType("Properties").propArray["Name"];
                    bc["Joins"][fn] = {};
                    for (p in props) {
                        bc["Joins"][fn][p] = props[p];
                    }
                }
                if (cc[c].type == "Multi Value Link") {
                    props = cc[c].GetChildByType("Properties").propArray;
                    fn = cc[c].GetChildByType("Properties").propArray["Name"];
                    bc["Multi Value Links"][fn] = {};
                    for (p in props) {
                        bc["Multi Value Links"][fn][p] = props[p];
                    }
                }
            }
            return retval;
        };

        //experimental extraction of "SRF" metadata cache, including NEOs
        //currently limited to BC and Field data
        //requires Base BCRM RR Integration Object and underlying BO/BCs (see sif files on github)
        BCRMUtils.prototype.GetNEOData = function (bc, field) {
            var sv = SiebelApp.S_App.GetService("BCRM RR Reader");
            var ips = SiebelApp.S_App.NewPropertySet();
            var ops = SiebelApp.S_App.NewPropertySet();
            var retval = {};
            ips.SetProperty("Business Component", bc);
            if (typeof (field) !== "undefined") {
                ips.SetProperty("Field", field);
            }
            ops = sv.InvokeMethod("GetRRBC", ips);
            var listofBC = ops.GetChildByType("ResultSet").GetChildByType("SiebelMessage").GetChild(0);

            //only first BC
            var thebc = listofBC.GetChild(0);
            for (prop in thebc.propArray) {
                retval[prop] = thebc.propArray[prop];
            }
            retval["Fields"] = {};
            var fields = thebc.GetChild(0);
            for (var i = 0; i < fields.GetChildCount(); i++) {
                var field = fields.GetChild(i);
                retval["Fields"][field.GetProperty("Name")] = {};
                for (fprop in field.propArray) {
                    retval["Fields"][field.GetProperty("Name")][fprop] = field.propArray[fprop];
                }
            }
            return retval;
        };

        //wrapper to get "formatted" BC data
        BCRMUtils.prototype.GetBCData = function (bcn) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var rrdata, bcdata, bcd;
            //use variable as client-side cache to avoid multiple queries for the same object
            //tried sesssionstorage but reaches quota
            var cache = "BCRM_RR_CACHE_BC_" + bcn;
            if (typeof (BCRCMETACACHE[cache]) === "undefined") {
                rrdata = ut.GetRRData("Buscomp", bcn);
                bcdata = ut.ExtractBCData(rrdata);
                bcd = bcdata["Business Component"];
                BCRCMETACACHE[cache] = JSON.stringify(bcd);
            }
            else {
                bcd = JSON.parse(BCRCMETACACHE[cache]);
            }
            return bcd;
        };

        BCRMUtils.prototype.ExtractAppletData = function (rrdata) {
            var retval = {};
            var ap;
            var props;
            var pc;
            var cc;
            var fn;
            retval["Applet"] = {};
            ap = retval["Applet"];
            props = rrdata.GetChild(0).GetChildByType("Properties").propArray;
            pc = props.length;
            for (p in props) {
                ap[p] = props[p];
            }
            ap["Controls"] = {};
            cc = rrdata.GetChild(0).childArray;
            for (c in cc) {
                if (cc[c].type == "Control") {
                    props = cc[c].GetChildByType("Properties").propArray;
                    fn = cc[c].GetChildByType("Properties").propArray["Name"];
                    ap["Controls"][fn] = {};
                    for (p in props) {
                        ap["Controls"][fn][p] = props[p];
                    }
                }
            }
            return retval;
        };

        BCRMUtils.prototype.GetAppletData = function (an) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var rrdata, appletdata, ad;
            //use variable as client-side cache to avoid multiple queries for the same object
            //tried sesssionstorage but reaches quota
            var cache = "BCRM_RR_CACHE_APPLET_" + an;
            if (typeof (BCRCMETACACHE[cache]) === "undefined") {
                rrdata = ut.GetRRData("Applet", an);
                appletdata = ut.ExtractAppletData(rrdata);
                ad = appletdata["Applet"];
                BCRCMETACACHE[cache] = JSON.stringify(ad);
            }
            else {
                ad = JSON.parse(BCRCMETACACHE[cache]);
            }
            return ad;
        };

        BCRMUtils.prototype.ShowControls = function (context) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var pm = ut.ValidateContext(context);
            var an, apd, tp, cs, cn, uit, pop;
            var nl;
            if (pm) {
                an = pm.GetObjName();
                apd = ut.GetAppletData(an);
                tp = ut.GetAppletType(pm);
                //currently supporting form applets only
                if (tp == "form" || tp == "list") {
                    cs = pm.Get("GetControls");
                    for (c in cs) {
                        pop = "";
                        if (cs.hasOwnProperty(c) && c != "CleanEmptyElements") {
                            cn = c;
                            uit = cs[cn].GetUIType();
                            if (uit == "Mvg") {
                                if (typeof (apd["Controls"][cn]) !== "undefined") {
                                    pop = apd["Controls"][cn]["MVG Applet"];
                                    //get Assoc applet
                                    var mvgd = ut.GetAppletData(pop);
                                    var asa = mvgd["Associate Applet"];
                                    if (asa != "") {
                                        uit = "Shuttle";
                                        pop = asa + "<br>" + pop;
                                    }
                                }
                            }
                            if (uit == "Pick") {
                                if (typeof (apd["Controls"][cn]) !== "undefined") {
                                    pop = apd["Controls"][cn]["Pick Applet"];
                                }
                            }
                            if (uit == "Button") {
                                pop = cs[cn].GetMethodName();
                            }
                            else {
                                //nothing to do as of yet
                            }
                            nl = uit + ":" + cn;
                            if (pop != "") {
                                nl += "<br>" + pop;
                            }
                            ut.SetLabel(cs[cn], nl, pm);
                        }
                    }
                }
            }
        };

        //show physical metadata (table.column), requires BCRM RR Reader service
        BCRMUtils.prototype.ShowTableColumns = function (context) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var pm = ut.ValidateContext(context);
            var table, column, mvlink, mvfield, mvbc, join;
            var bcd2;
            var bc, bcd, bcn, fm, cs, tp, fn, fd;
            var fdt, fln, fcl, frq;
            var nl;
            if (pm) {
                bc = pm.Get("GetBusComp");
                bcn = bc.GetName();
                //get RR CLOB Data from BCRM RR Reader service
                bcd = ut.GetBCData(bcn);
                fm = bc.GetFieldMap();
                tp = ut.GetAppletType(pm);

                if (tp == "form" || tp == "list") {
                    cs = pm.Get("GetControls");
                    for (c in cs) {
                        if (cs.hasOwnProperty(c) && c != "CleanEmptyElements") {
                            var cn = c;
                            fn = cs[cn].GetFieldName();
                            if (fn != "") {
                                fd = fm[fn];
                                fdt = fd.GetDataType(); //get the data type (text, bool, etc)
                                fln = fd.GetLength(); //get the field length (30, 100, etc)
                                frq = fd.IsRequired() ? "*" : ""; //get an asterisk when field is required, otherwise nothing
                                fcl = fd.IsCalc() ? "C" : ""; //get a "C" when field is calculated, otherwise nothing

                                if (typeof (bcd["Fields"][fn]) !== "undefined") {

                                    table = bcd["Table"];
                                    column = bcd["Fields"][fn]["Column"];

                                    //Join lookup
                                    if (bcd["Fields"][fn]["Join"] != "") {
                                        join = bcd["Fields"][fn]["Join"];
                                        if (typeof (bcd["Joins"][join]) !== "undefined") {
                                            table = bcd["Joins"][join]["Table"];
                                        }
                                        else {
                                            table = join;
                                        }
                                    }
                                    nl = table + "." + column;

                                    //calculated fields
                                    if (fcl == "C") {
                                        nl = "Calc: " + bcd["Fields"][fn]["Calculated Value"];
                                    }

                                    //multi-value fields
                                    if (bcd["Fields"][fn]["Multi Valued"] == "Y") {
                                        //debugger;
                                        mvlink = bcd["Fields"][fn]["Multi Value Link"];
                                        mvfield = bcd["Fields"][fn]["Dest Field"];
                                        if (typeof (bcd["Multi Value Links"][mvlink]) !== "undefined") {
                                            mvbc = bcd["Multi Value Links"][mvlink]["Destination Business Component"];
                                            bcd2 = ut.GetBCData(mvbc);
                                            if (typeof (bcd2["Fields"][mvfield]) !== "undefined") {
                                                table = bcd2["Table"];
                                                column = bcd2["Fields"][mvfield]["Column"];
                                                //Join lookup
                                                if (bcd2["Fields"][mvfield]["Join"] != "") {
                                                    join = bcd2["Fields"][mvfield]["Join"];
                                                    if (typeof (bcd2["Joins"][join]) !== "undefined") {
                                                        table = bcd2["Joins"][join]["Table"];
                                                    }
                                                    else {
                                                        table = join;
                                                    }
                                                }
                                            }
                                        }
                                        //nl = "MVF: " + mvbc + "::" + mvfield;
                                        nl = "MVF: " + table + "." + column;
                                    }
                                }
                                //field not found in bcdata
                                else {
                                    //try experimental NEO access
                                    try {
                                        var neo = ut.GetNEOData(bcn, fn);
                                        if (typeof (neo["Fields"][fn]) !== "undefined") {
                                            table = neo["Fields"][fn]["Join"];
                                            column = neo["Fields"][fn]["Column"];
                                            nl = table + "." + column;
                                        }
                                        else {
                                            //display field info from OUI layer
                                            nl = "System: " + fn + " (" + fdt + "/" + fln + ")" + frq + fcl;
                                        }
                                    }
                                    catch(e){
                                        nl = "System: " + fn + " (" + fdt + "/" + fln + ")" + frq + fcl;
                                    }
                                }
                                ut.SetLabel(cs[cn], nl, pm);
                            }
                        }
                    }
                }
            }
        }

        //the big equalizer function, always get a PM, no matter the input (almost)
        BCRMUtils.prototype.ValidateContext = function (inp) {
            var retval = false;
            try {
                var pm = null;
                var ap;
                //context might be an applet instance
                //the GetPModel function gives it away
                if (typeof (inp.GetPModel) === "function") {
                    pm = inp.GetPModel();
                }
                //or it is a PM already...
                else if (typeof (inp.OnControlEvent) === "function") {
                    pm = inp;
                }
                //... or a PR, then we can get the PM easily:
                else if (typeof (inp.GetPM) === "function") {
                    pm = inp.GetPM();
                }
                //...we do not like controls, but anyway...
                else if (typeof (inp.GetInputName) === "function") {
                    pm = inp.GetApplet().GetPModel();

                }
                //context is neither an applet, PM nor PR...
                //...but could be an id string such as "S_A1" or "Contact List Applet"
                else if (typeof (inp) === "string") {
                    var temp = inp;
                    var appletmap = SiebelApp.S_App.GetActiveView().GetAppletMap();
                    for (ap in appletmap) {
                        if (temp.indexOf("S_") === 0) {
                            if (appletmap[ap].GetPModel().Get("GetFullId") == inp) {
                                pm = appletmap[ap].GetPModel();
                            }
                        }
                        else { //assume it's the applet name
                            pm = appletmap[temp].GetPModel();
                        }
                    }
                }
                else {
                    throw ("BCRMUtils.ValidateContext: Could not equalize PM.");
                }
            }
            catch (e) {
                console.log(e.toString());
            }
            finally {
                retval = pm;
            }
            return retval;
        };

        //get applet type
        BCRMUtils.prototype.GetAppletType = function (context) {
            var retval = false;
            var type = null;
            var pm = null;
            var id = null;
            var an = "";
            var ut = new SiebelAppFacade.BCRMUtils();
            pm = ut.ValidateContext(context);
            if (pm) {
                if (typeof (pm.Get) === "function") {
                    if (pm.Get("GetListOfColumns")) {
                        retval = "list";
                        type = true;
                    }
                }
                id = pm.Get("GetFullId");
                if ($("#" + id).find(".siebui-tree").length != 0) { //it's a tree!
                    retval = "tree";
                    type = true;
                }
                else if (!type) {  //finding out whether it's a chart applet is tricky...
                    id = pm.Get("GetFullId").split("_")[1]; //chart applets have weird Ids
                    id = id.toLowerCase().charAt(0) + "_" + id.charAt(1);  //did I mention that they have weird Ids
                    if ($("#" + id).find(".siebui-charts-container").length != 0) {
                        retval = "chart"; //It's a Bingo! -- Do you say it like that? -- No, you just say 'Bingo!'.
                    }
                    else { //no list,tree or chart. 99% sure it's a form applet
                        retval = "form";
                    }
                }
                an = pm.GetObjName();
            }
            else {//not of this world...
                retval = "unknown"
            }
            //console.log("BCRMUtils.GetAppletType: " + an + " is a " + retval);
            return retval;
        };

        //get the applet DOM element
        BCRMUtils.prototype.GetAppletElem = function (context) {
            var retval = null;
            var ut = new SiebelAppFacade.BCRMUtils();
            var pm = ut.ValidateContext(context);
            var appletElem = null;
            if (pm) {
                var appletElemId = pm.Get("GetFullId");
                appletElem = $("#" + "s_" + appletElemId + "_div");
            }
            retval = appletElem;
            return retval;
        };
        return BCRMUtils;
    }());
}
