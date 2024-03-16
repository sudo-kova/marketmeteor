export function setupTitlesInteraction() {
    // console.log('Adding button listeners...');

    var graphDiv5Button = document.querySelector("button[data-target='graphDiv5']");
    var holdingsDiv6Button = document.querySelector("button[data-target='holdingsDiv6']");
    var graphDiv5 = document.getElementById("graphDiv5");
    var holdingsDiv6 = document.getElementById("holdingsDiv6");

    graphDiv5Button.addEventListener("click", function() {
        // holdingsDiv6.classList.remove('tab_button_active');
        // graphDiv5.classList.add('tab_button_active');

        graphDiv5.classList.add('showdiv');
        graphDiv5.classList.remove('hidediv');
        holdingsDiv6.classList.add('hidediv');
        holdingsDiv6.classList.remove('showdiv');
        // console.log("Showing Incoming Meteors");

        document.getElementById('refreshholdings').classList.add('button-disabled');
        document.getElementById('refresh_m20').classList.remove('button-disabled');
        document.getElementById('applyfilter_m20').classList.remove('button-disabled');

        let holdingsSettingsMenu = document.querySelector('.holdingsettingsmenu');
        holdingsSettingsMenu.classList.add('button-disabled');

        let meteorssettingsmenu = document.querySelector('.meteorssettingsmenu');
        meteorssettingsmenu.classList.remove('button-disabled');

    });

    holdingsDiv6Button.addEventListener("click", function() {
        // graphDiv5.classList.remove('tab_button_active');
        // holdingsDiv6.classList.add('tab_button_active');

        holdingsDiv6.classList.add('showdiv');
        holdingsDiv6.classList.remove('hidediv');
        graphDiv5.classList.add('hidediv');
        graphDiv5.classList.remove('showdiv');
        // console.log("Showing Holdings");

        document.getElementById('refreshholdings').classList.remove('button-disabled');
        document.getElementById('refresh_m20').classList.add('button-disabled');
        document.getElementById('applyfilter_m20').classList.add('button-disabled');

        let holdingsSettingsMenu = document.querySelector('.holdingsettingsmenu');
        holdingsSettingsMenu.classList.remove('button-disabled');

        let meteorssettingsmenu = document.querySelector('.meteorssettingsmenu');
        meteorssettingsmenu.classList.add('button-disabled');

    });
}

export function setupWalkaround(){

    // WALKTHROUGH PROGRESSION

    // ---- [1] WELCOME SCREEN ---- dialog only
    document.getElementById('walkthroughLink').addEventListener('click', function() {
        var tutorialDiv = document.querySelector('.tutorial_div');
        tutorialDiv.classList.add('showwalkthrough');
        // CONTINUE once close_btn is pressed
        document.querySelector('.close_btn').addEventListener('click', function() {
            var tutorialDiv = document.querySelector('.tutorial_div');
            tutorialDiv.classList.remove('showwalkthrough');

            // ---- [2] TICKER TAPE ---- dialog and circle
            var tutorialDivTape = document.querySelector('.tutorial_div_ticker_tape');
            tutorialDivTape.classList.add('showwalkthrough');
            var element = document.getElementById("ticker_tape_circle");
            if (element) {
                element.classList.remove("hidediv");
            }
            // CONTINUE once close_btn_ticker_tape is pressed
            document.querySelector('.close_btn_tickertape').addEventListener('click', function() {
                var tutorialDivTape = document.querySelector('.tutorial_div_ticker_tape');
                tutorialDivTape.classList.remove('showwalkthrough');
                var element = document.getElementById("ticker_tape_circle");
                if (element) {
                    element.classList.add("hidediv");
                }
                // ---- [3] SUMMARY INFO ---- dialog and circle
                var tutorialDivSummary = document.querySelector('.tutorial_div_summary_info');
                tutorialDivSummary.classList.add('showwalkthrough');
                var element = document.getElementById("summary_circle");
                if (element) {
                    element.classList.remove("hidediv");
                }
                // CONTINUE once close_btn_summary_info is pressed
                document.querySelector('.close_btn_summary_info').addEventListener('click', function() {
                    var tutorialDivTape = document.querySelector('.tutorial_div_summary_info');
                    tutorialDivTape.classList.remove('showwalkthrough');
                    var element = document.getElementById("summary_circle");
                    if (element) {
                        element.classList.add("hidediv");
                    }
                    // ---- [4] DOUBLE CLICK TITLE BAR ---- dialog and circle
                    var tutorialDivSummary = document.querySelector('.tutorial_div_title_bar_dbl');
                    tutorialDivSummary.classList.add('showwalkthrough');
                    var element = document.getElementById("title_bar_dbl_circle");
                    if (element) {
                        element.classList.remove("hidediv");
                    }
                    // CONTINUE once close_btn_title_bar_dbl is pressed
                    document.querySelector('.close_btn_title_bar_dbl').addEventListener('click', function() {
                        var tutorialDivTape = document.querySelector('.tutorial_div_title_bar_dbl');
                        tutorialDivTape.classList.remove('showwalkthrough');
                        var element = document.getElementById("title_bar_dbl_circle");
                        if (element) {
                            element.classList.add("hidediv");
                        }
                        // ---- [5] CLOSE VS. DATE OVERVIEW ---- dialog
                        var tutorialDivSummary = document.querySelector('.tutorial_div_close_v_date');
                        tutorialDivSummary.classList.add('showwalkthrough');
                        // CONTINUE once close_btn_close_v_date is pressed
                        document.querySelector('.close_btn_close_v_date').addEventListener('click', function(){
                            var tutorialDivTape = document.querySelector('.tutorial_div_close_v_date');
                            tutorialDivTape.classList.remove('showwalkthrough');

                            simulateDoubleClick('#rd_closeseries');

                            // ---- [6] 63d% VS. DATE OVERVIEW ---- dialog
                            simulateDoubleClick('#rd_63d');
                            var tutorialDivSummary = document.querySelector('.tutorial_div_63d_v_date');
                            tutorialDivSummary.classList.add('showwalkthrough');
                            // CONTINUE once close_btn_63d_v_date is pressed
                            document.querySelector('.close_btn_63d_v_date').addEventListener('click', function() {
                                var tutorialDivTape = document.querySelector('.tutorial_div_63d_v_date');
                                tutorialDivTape.classList.remove('showwalkthrough');

                                simulateDoubleClick('#rd_63d');

                                // ---- [7] 63d% VS. Earnings offset closest ---- dialog
                                simulateDoubleClick('#rd_63dearnings');
                                var tutorialDivSummary = document.querySelector('.tutorial_div_63d_v_earnings');
                                tutorialDivSummary.classList.add('showwalkthrough');
                                // CONTINUE once close_btn_63d_v_earnings is pressed
                                document.querySelector('.close_btn_63d_v_earnings').addEventListener('click', function() {
                                    var tutorialDivTape = document.querySelector('.tutorial_div_63d_v_earnings');
                                    tutorialDivTape.classList.remove('showwalkthrough');

                                    simulateDoubleClick('#rd_63dearnings');

                                    // ---- [7] Maximum Delta Forward 63 Days Overview ---- dialog
                                    simulateDoubleClick('#rd_maxfwd');
                                    var tutorialDivSummary = document.querySelector('.tutorial_div_63d_v_fwd');
                                    tutorialDivSummary.classList.add('showwalkthrough');
                                    // CONTINUE once close_btn_63d_v_fwd is pressed
                                    document.querySelector('.close_btn_63d_v_fwd').addEventListener('click', function(){
                                        var tutorialDivTape = document.querySelector('.tutorial_div_63d_v_fwd');
                                        tutorialDivTape.classList.remove('showwalkthrough');

                                        simulateDoubleClick('#rd_maxfwd');

                                        // ---- [8] Watchlist Overview ---- dialog and circle
                                        simulateDoubleClick('#watchlist');
                                        var tutorialDivSummary = document.querySelector('.tutorial_div_watchlist_ovr');
                                        tutorialDivSummary.classList.add('showwalkthrough');
                                        var element = document.getElementById("watchlist_ovr_circle");
                                        if (element) {
                                            element.classList.remove("hidediv");
                                        }

                                        // CONTINUE once close_btn_watchlist_ovr is pressed
                                        document.querySelector('.close_btn_watchlist_ovr').addEventListener('click', function(){
                                            var tutorialDivTape = document.querySelector('.tutorial_div_watchlist_ovr');
                                            tutorialDivTape.classList.remove('showwalkthrough');
                                            var element = document.getElementById("watchlist_ovr_circle");
                                            if (element) {
                                                element.classList.add("hidediv");
                                            }
                                                
                                            // ---- [8] Watchlist Columns ---- dialog and circle
                                            var tutorialDivSummary = document.querySelector('.tutorial_div_watchlist_cols');
                                            tutorialDivSummary.classList.add('showwalkthrough');

                                            // CONTINUE once close_btn_watchlist_ovr is pressed
                                            document.querySelector('.close_btn_watchlist_cols').addEventListener('click', function(){
                                                var tutorialDivTape = document.querySelector('.tutorial_div_watchlist_cols');
                                                tutorialDivTape.classList.remove('showwalkthrough');

                                                // ---- [9] Holdings Columns ---- dialog
                                                var tutorialDivSummary = document.querySelector('.tutorial_div_holdings');
                                                tutorialDivSummary.classList.add('showwalkthrough');

                                                document.querySelector('.close_btn_holdings').addEventListener('click', function(){
                                                    var tutorialDivTape = document.querySelector('.tutorial_div_holdings');
                                                    tutorialDivTape.classList.remove('showwalkthrough');
                                                    simulateDoubleClick('#watchlist');
                                                });


                                                
                                            });

                                           

                                        });

                                        // ensure that the 5 grids are showing

                                        // const divIdsToShow = ['rd_closeseries', 'rd_63d', 'rd_63dearnings', 'watchlist', 'rd_maxfwd'];
                                        // divIdsToShow.forEach(divId => {
                                        //     const div = document.getElementById(divId);
                                        //     if (div) {
                                        //         div.classList.remove('hidediv');
                                        //         div.classList.add('showdiv');
                                        //     }
                                        // });


                                    });

                                });
                            });


                        });


                    });

                });


            });


        });
    });

}

// Function to simulate a double-click
export function simulateDoubleClick(selector) {

    // Use requestAnimationFrame: For visual changes, wrapping the changes in requestAnimationFrame 
    // can ensure they're made at the optimal time in the browser's rendering cycle.

    var event = new MouseEvent('dblclick', {
      'bubbles': true,
      'cancelable': true
    });
  
    var element = document.querySelector(selector);
    
    if(element) {
      requestAnimationFrame(function() {
        element.dispatchEvent(event);
      });
    } else {
      console.error('Element not found');
    }
  }