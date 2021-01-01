//EDUCATIONAL SAMPLE!!! DO NOT USE IN PRODUCTION!!!
//copy below code to vanilla postload.js or custom PL

//re-visiting the applet x-ray in 20.12
//ahansal, 2020-12-30

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
                    ae = ut.GetAppletElem(pm);
                    ae.dblclick(function () //jQuery double-click event handler
                    {
                        var cycle; //the toggle cycle
                        switch (pm.Get("C_ToggleCycle")) {
                            case "ShowBCFields": cycle = "ShowTableColumns";
                                break;
                            case "ShowTableColumns": cycle = "Reset";
                                break;
                            case "Reset": cycle = "ShowBCFields";
                                break;
                            default: cycle = "ShowBCFields";
                                break;
                        }
                        pm.SetProperty("C_ToggleCycle", cycle); //set property to current cycle
                        ut.ToggleLabels(cycle, pm); //call utility method
                        //console.log(cycle);
                    });
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
                    le.text(nl);
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
            var pr, ce, li, ae, inpname, gh, ph, ch, cm, fn, cn;
            var thelabel;
            var retval = null;
            if (pm) {
                tp = ut.GetAppletType(pm);
                pr = pm.GetRenderer();
                ae = ut.GetAppletElem(pm);
                if (tp == "form") {
                    //get control element
                    ce = pr.GetUIWrapper(c).GetEl();
                    inpname = c.GetInputName();
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

                    //check if label has been found
                    if (thelabel.length == 1) {
                        //tag the label
                        thelabel.attr("bcrm-label-for", inpname);
                        retval = thelabel;
                    }
                }
                if (tp == "list") {
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
                    if (thelabel.length == 1) {
                        retval = thelabel;
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
            //debugger;
            return retval;
        };

        BCRMUtils.prototype.GetBCData = function(bcn){
            var ut = new SiebelAppFacade.BCRMUtils();
            var rrdata,bcdata,bcd;
            var cache = "BCRM_RR_CACHE_BC_" + bcn;
            if (!sessionStorage.getItem(cache)) {
                rrdata = ut.GetRRData("Buscomp", bcn);
                bcdata = ut.ExtractBCData(rrdata);
                bcd = bcdata["Business Component"];
                sessionStorage.setItem(cache, JSON.stringify(bcd));
            }
            else {
                bcd = JSON.parse(sessionStorage.getItem(cache));
            }
            return bcd;
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
                //Form Applet treatment
                if (tp == "form" || tp == "list") {
                    cs = pm.Get("GetControls");
                    for (c in cs) {
                        if (cs.hasOwnProperty(c) && c != "CleanEmptyElements") {
                            fn = cs[c].GetFieldName();
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
                                    //display field info from OUI layer
                                    nl = "System: " + fn + " (" + fdt + "/" + fln + ")" + frq + fcl;
                                }
                                ut.SetLabel(cs[c], nl, pm);
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
            console.log("BCRMUtils.GetAppletType: " + an + " is a " + retval);
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
