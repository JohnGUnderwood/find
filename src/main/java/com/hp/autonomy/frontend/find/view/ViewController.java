package com.hp.autonomy.frontend.find.view;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Created by john.underwood on 2/18/2015.
 */

@Controller
@RequestMapping("/api/view/view-document")
public class ViewController {

    @Autowired
    private ViewService viewService;

    @RequestMapping (method = RequestMethod.GET)
    public void viewDocument (
        @RequestParam final String reference,
        final HttpServletResponse response
    ) throws IOException {
        viewService.viewDocument(reference, response.getOutputStream());
    }


}
