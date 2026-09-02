// /js/app.js

const spreadsheetElement = document.getElementById("spreadsheet");

if (spreadsheetElement) {
    let spreadsheet;

    const formulaBar = document.getElementById("formulaBar");
    const cellName = document.getElementById("cellName");
    const saveStatus = document.getElementById("saveStatus");

    let selectedWorksheet = null;
    let selectedX = 0;
    let selectedY = 0;

    // Jspreadsheet v12
    if (typeof jspreadsheet === "undefined") {
        console.error("Jspreadsheet was not loaded.");
        if (saveStatus) {
            saveStatus.textContent = "Jspreadsheet failed to load";
        }
    } else {

        jspreadsheet.setLicense("evaluation");

        // --------------------------------------------
        // Load saved workbook
        // --------------------------------------------

        function getWorkbook() {
            try {
                const saved = localStorage.getItem(
                    "myexcel_workbook"
                );

                if (saved) {
                    return JSON.parse(saved);
                }
            } catch (error) {
                console.error("Could not load workbook:", error);
            }

            return null;
        }


        // --------------------------------------------
        // Default workbook
        // --------------------------------------------

        function getDefaultWorksheets() {
            return [
                {
                    worksheetName: "Sheet1",

                    minDimensions: [12, 30],

                    data: [
                        ["Product", "Quantity", "Price"],
                        ["Apple", 10, 50],
                        ["Orange", 20, 40],
                        ["Banana", 15, 30]
                    ],

                    columns: [
                        {
                            type: "text",
                            title: "Product",
                            width: 200
                        },
                        {
                            type: "numeric",
                            title: "Quantity",
                            width: 100
                        },
                        {
                            type: "numeric",
                            title: "Price",
                            width: 100
                        }
                    ]
                }
            ];
        }


        // --------------------------------------------
        // Create spreadsheet
        // --------------------------------------------

        function createSpreadsheet() {

            const saved = getWorkbook();

            let worksheets =
                saved?.worksheets ||
                getDefaultWorksheets();

            spreadsheet = jspreadsheet(
                spreadsheetElement,
                {
                    tabs: true,
                    toolbar: true,

                    worksheets: worksheets,

                    onselection: function (
                        worksheet,
                        x1,
                        y1
                    ) {
                        selectedWorksheet = worksheet;
                        selectedX = x1;
                        selectedY = y1;

                        updateFormulaBar(
                            worksheet,
                            x1,
                            y1
                        );
                    },

                    onchange: function () {
                        setStatus("Unsaved changes");
                    }
                }
            );

            setStatus("Ready");
        }


        // --------------------------------------------
        // Formula bar
        // --------------------------------------------

        function updateFormulaBar(
            worksheet,
            x,
            y
        ) {
            if (!formulaBar || !cellName) {
                return;
            }

            cellName.textContent =
                getColumnName(x) + (y + 1);

            try {
                const value =
                    worksheet.getValueFromCoords(x, y);

                formulaBar.value =
                    value == null ? "" : value;

            } catch (error) {
                console.error(
                    "Could not read cell:",
                    error
                );

                formulaBar.value = "";
            }
        }


        // --------------------------------------------
        // Convert column number to A, B, C...
        // --------------------------------------------

        function getColumnName(index) {

            let name = "";
            let number = index + 1;

            while (number > 0) {

                const remainder =
                    (number - 1) % 26;

                name =
                    String.fromCharCode(
                        65 + remainder
                    ) + name;

                number =
                    Math.floor(
                        (number - 1) / 26
                    );
            }

            return name;
        }


        // --------------------------------------------
        // Formula bar -> selected cell
        // --------------------------------------------

        formulaBar?.addEventListener(
            "keydown",
            function (event) {

                if (event.key !== "Enter") {
                    return;
                }

                if (!selectedWorksheet) {
                    return;
                }

                event.preventDefault();

                try {

                    selectedWorksheet.setValueFromCoords(
                        selectedX,
                        selectedY,
                        formulaBar.value
                    );

                    setStatus("Unsaved changes");

                } catch (error) {

                    console.error(
                        "Could not update cell:",
                        error
                    );

                    setStatus("Update failed");
                }
            }
        );


        // --------------------------------------------
        // Save workbook
        // --------------------------------------------

        function saveWorkbook() {

            if (!spreadsheet) {
                return;
            }

            try {

                const config =
                    spreadsheet.getConfig();

                localStorage.setItem(
                    "myexcel_workbook",
                    JSON.stringify(config)
                );

                setStatus(
                    "Saved " +
                    new Date().toLocaleTimeString()
                );

            } catch (error) {

                console.error(
                    "Save failed:",
                    error
                );

                setStatus("Save failed");
            }
        }


        // --------------------------------------------
        // Save button
        // --------------------------------------------

        document
            .getElementById("saveButton")
            ?.addEventListener(
                "click",
                saveWorkbook
            );


        // --------------------------------------------
        // New sheet
        // --------------------------------------------

        document
            .getElementById("newSheetButton")
            ?.addEventListener(
                "click",
                function () {

                    if (!spreadsheet) {
                        return;
                    }

                    try {

                        const sheetNumber =
                            document.querySelectorAll(
                                ".jtabs-tab"
                            ).length + 1;

                        spreadsheet.createWorksheet({
                            worksheetName:
                                "Sheet" + sheetNumber,

                            minDimensions: [12, 30]
                        });

                        setStatus(
                            "New sheet created"
                        );

                    } catch (error) {

                        console.error(
                            "Could not create sheet:",
                            error
                        );

                        setStatus(
                            "Could not create sheet"
                        );
                    }
                }
            );


        // --------------------------------------------
        // Refresh
        // --------------------------------------------

        document
            .getElementById("refreshButton")
            ?.addEventListener(
                "click",
                function () {

                    location.reload();
                }
            );


        // --------------------------------------------
        // Logout
        // --------------------------------------------

        document
            .getElementById("logoutButton")
            ?.addEventListener(
                "click",
                function () {

                    localStorage.removeItem(
                        "myexcel_user"
                    );

                    window.location.href =
                        "/index.html";
                }
            );


        // --------------------------------------------
        // Ctrl + S / Cmd + S
        // --------------------------------------------

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    (event.ctrlKey || event.metaKey) &&
                    event.key.toLowerCase() === "s"
                ) {

                    event.preventDefault();

                    saveWorkbook();
                }
            }
        );


        // --------------------------------------------
        // Status
        // --------------------------------------------

        function setStatus(message) {

            if (saveStatus) {
                saveStatus.textContent = message;
            }
        }


        // --------------------------------------------
        // Start
        // --------------------------------------------

        createSpreadsheet();
    }
}
