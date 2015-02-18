package com.hp.autonomy.frontend.find.view;

import java.io.OutputStream;

/**
 * Created by john.underwood on 2/18/2015.
 */
public interface ViewService {

    void viewDocument(String reference, OutputStream outputStream);

}
